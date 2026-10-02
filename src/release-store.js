// Isolated lifecycle kernel. NOT connected to a production installer/launcher.
// No downloads, archive extraction, process termination, data migration or deletion.
import path from 'node:path';
import { readFile, writeFile, mkdir, readdir, copyFile, rename, lstat, unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { assertRuntimeContext, assertNoLinks, within } from './runtime-context.js';
const fail = message => Object.assign(new Error(message), { code: 'ERR_RELEASE_STORE' });
async function digest(file) { const hash = createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('hex'); }
export function validateReleaseManifest(manifest) {
  if (manifest.format !== 1 || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(manifest.version || '') || !/^[a-f0-9]{40}$/.test(manifest.commit || '') || !Number.isInteger(manifest.schemaMin) || !Number.isInteger(manifest.schemaMax) || manifest.schemaMin < 1 || manifest.schemaMax < manifest.schemaMin || !Array.isArray(manifest.files) || !manifest.files.length) throw fail('Invalid release metadata.');
  const names = new Set();
  for (const file of manifest.files) {
    if (typeof file.path !== 'string' || !/^[a-zA-Z0-9_.@/-]+$/.test(file.path) || file.path.startsWith('/') || file.path.split('/').some(part => !part || part === '.' || part === '..' || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) || part.endsWith('.')) || file.path === 'release.json' || /(^|\/)(\.clipboard-bridge|\.local|history|inbox|outbox|webview|node_modules\.cache)(\/|$)/i.test(file.path) || /\.(pfx|dpapi|key|p12)$/i.test(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256 || '') || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw fail('Invalid release file.');
    if (names.has(file.path.toLowerCase())) throw fail('Duplicate case-insensitive package path.');
    names.add(file.path.toLowerCase());
  }
  return manifest;
}
async function filesIn(root, relative = '') {
  await assertNoLinks(path.join(root, relative)); const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw fail('Linked release entry.');
    if (entry.isDirectory()) files.push(...await filesIn(root, name));
    else if (entry.isFile()) files.push(name); else throw fail('Non-regular release entry.');
  }
  return files.sort();
}
export async function verifyRelease(directory, expectedManifestHash) {
  if (!path.isAbsolute(directory) || !/^[a-f0-9]{64}$/.test(expectedManifestHash || '')) throw fail('Explicit package root and independently pinned manifest digest required.');
  await assertNoLinks(directory);
  const file = path.join(directory, 'release.json');
  const metadata = await lstat(file);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 4 * 1024 ** 2) throw fail('Invalid manifest file.');
  if (await digest(file) !== expectedManifestHash) throw fail('Manifest digest mismatch.');
  const manifest = validateReleaseManifest(JSON.parse(await readFile(file, 'utf8')));
  const names = await filesIn(directory);
  if (JSON.stringify(names) !== JSON.stringify(['release.json', ...manifest.files.map(item => item.path)].sort())) throw fail('Unlisted or missing package files.');
  for (const item of manifest.files) {
    const target = path.join(directory, item.path);
    if (!within(directory, target) || (await lstat(target)).size !== item.bytes || await digest(target) !== item.sha256) throw fail('Payload integrity mismatch.');
  }
  return manifest;
}

export async function createIsolatedReleaseStore({ context, stop, isStopped, probe, activate }) {
  assertRuntimeContext(context);
  if (context.mode === 'production') throw fail('Production lifecycle adapter has not passed acceptance.');
  if (![stop, isStopped, probe, activate].every(fn => typeof fn === 'function')) throw fail('Explicit isolated lifecycle adapters required.');
  const root = context.dataRoot + '.releases';
  await assertNoLinks(root); await mkdir(root, { recursive: true });
  const ownerFile = path.join(root, 'owner.json');
  const owner = { application: 'PanoKopru-isolated-release-store', instanceId: context.instanceId };
  try { if (JSON.stringify(JSON.parse(await readFile(ownerFile, 'utf8'))) !== JSON.stringify(owner)) throw fail('Store ownership mismatch.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; if ((await readdir(root)).length) throw fail('Non-empty unowned release store.'); await writeFile(ownerFile, JSON.stringify(owner), { flag: 'wx' }); }
  const pointer = path.join(root, 'active.json'), journal = path.join(root, 'transaction.json');
  const readOptional = async file => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
  const atomic = async (file, value) => { const temp = file + '.' + randomUUID(); await writeFile(temp, JSON.stringify(value), { flag: 'wx' }); await rename(temp, file); };
  const compatible = async manifest => { const schema = JSON.parse(await readFile(path.join(context.dataRoot, 'data-schema.json'), 'utf8')).version; if (!Number.isInteger(schema) || schema < manifest.schemaMin || schema > manifest.schemaMax) throw fail('Data schema is incompatible; data was not restored or downgraded.'); };
  const reference = async ref => {
    if (!ref || !/^[a-f0-9]{64}$/.test(ref.hash || '')) throw fail('Invalid active release reference.');
    const directory = path.join(root, ref.hash); const manifest = await verifyRelease(directory, ref.hash); await compatible(manifest); return { directory, manifest };
  };
  async function exclusive(action) {
    const lock = path.join(root, 'update.lock');
    await writeFile(lock, JSON.stringify({ instanceId: context.instanceId }), { flag: 'wx' });
    try { return await action(); } finally { await unlink(lock); }
  }
  return {
    root,
    status: () => readOptional(pointer),
    update: (directory, hash) => exclusive(async () => {
      if (await readOptional(journal)) throw fail('Interrupted update needs explicit recovery first.');
      const manifest = await verifyRelease(directory, hash); await compatible(manifest);
      const prior = await readOptional(pointer);
      if (prior) await reference(prior.current);
      const target = path.join(root, hash);
      try { await lstat(target); await verifyRelease(target, hash); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const stage = path.join(root, 'stage-' + randomUUID()); await mkdir(stage);
        for (const file of ['release.json', ...manifest.files.map(item => item.path)]) { await mkdir(path.dirname(path.join(stage, file)), { recursive: true }); await copyFile(path.join(directory, file), path.join(stage, file)); }
        await verifyRelease(stage, hash); await rename(stage, target);
      }
      if (await probe(target, manifest) !== true) throw fail('Candidate preflight failed; active pointer unchanged.');
      const next = { current: { hash, version: manifest.version, commit: manifest.commit }, previous: prior?.current || null };
      await atomic(journal, { prior, next });
      try {
        await stop(); if (await isStopped() !== true) throw fail('Application did not stop.');
        await compatible(manifest); await atomic(pointer, next);
        if (await activate(target, manifest) !== true) throw fail('Candidate health check failed.');
        await unlink(journal); return next;
      } catch (error) {
        // No data restoration, no blind restart after an uncertain process failure.
        error.code = 'ERR_UPDATE_RECOVERY_REQUIRED'; throw error;
      }
    }),
    recover: ({ confirmedStopped } = {}) => exclusive(async () => {
      if (confirmedStopped !== true || await isStopped() !== true) throw fail('Explicit stopped-state recovery required.');
      const transaction = await readOptional(journal); if (!transaction) return { recovered: false };
      if (!transaction.prior) throw fail('Initial installation interrupted; no previous release. Manual review required.');
      await reference(transaction.prior.current);
      await atomic(pointer, transaction.prior); await unlink(journal);
      return { recovered: true, dataRestored: false, restartRequired: true };
    }),
    rollback: ({ confirmedStopped } = {}) => exclusive(async () => {
      if (await readOptional(journal)) throw fail('Recover interrupted transaction first.');
      if (confirmedStopped !== true || await isStopped() !== true) throw fail('Explicit stopped-state rollback required.');
      const current = await readOptional(pointer); await reference(current?.previous);
      await atomic(pointer, { current: current.previous, previous: current.current });
      return { rolledBack: true, dataRestored: false, restartRequired: true };
    })
  };
}
