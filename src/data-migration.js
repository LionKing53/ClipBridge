// Offline copy-only migration. No automatic production invocation or original deletion.
import { readdir, lstat, mkdir, readFile, writeFile, copyFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { assertNoLinks, within, DATA_SCHEMA } from './runtime-context.js';

const fail = message => Object.assign(new Error(message), { code: 'ERR_DATA_MIGRATION' });
async function inventory(root, base = root) {
  await assertNoLinks(root);
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    const info = await lstat(target);
    if (info.isSymbolicLink()) throw fail('Linked data is not migratable.');
    if (info.isDirectory()) files.push(...await inventory(target, base));
    else if (info.isFile()) {
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(target)) hash.update(chunk);
      files.push({ path: path.relative(base, target), bytes: info.size, sha256: hash.digest('hex') });
    }
    else throw fail('Unsupported data entry.');
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
async function absent(target) { try { await lstat(target); throw fail('Destination already exists; it will not be overwritten.'); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
async function copyInventory(from, to, files) {
  for (const file of files) { const target = path.join(to, file.path); await mkdir(path.dirname(target), { recursive: true }); await copyFile(path.join(from, file.path), target); }
  if (JSON.stringify(await inventory(to)) !== JSON.stringify(files)) throw fail('Copied data checksum verification failed.');
}
export async function migrateLegacyData({ from, to, backup, confirmedStopped = false, confirmedSameAccount = false, secureDirectory, beforeCommit = async () => {} }) {
  if (!confirmedStopped || !confirmedSameAccount) throw fail('Offline same-account migration must be explicitly confirmed.');
  if (typeof secureDirectory !== 'function') throw fail('A reviewed private-directory ACL adapter is required.');
  if (![from, to, backup].every(value => typeof value === 'string' && path.isAbsolute(value))) throw fail('Explicit absolute paths required.');
  from = path.resolve(from); to = path.resolve(to); backup = path.resolve(backup);
  for (const [a, b] of [[from, to], [from, backup], [to, backup]]) if (within(a, b) || within(b, a)) throw fail('Migration paths must not overlap.');
  for (const target of [from, to, backup]) await assertNoLinks(target);
  await absent(to); await absent(backup);
  const files = await inventory(from);
  if (files.some(file => ['instance.lock', 'data-schema.json'].includes(file.path))) throw fail('Source is active or already versioned.');
  const config = JSON.parse(await readFile(path.join(from, 'config.json'), 'utf8'));
  if (typeof config.token !== 'string' || config.token.length < 32) throw fail('Invalid legacy credentials; nothing will be replaced.');
  await mkdir(backup, { recursive: false });
  await secureDirectory(backup);
  await copyInventory(from, backup, files);
  // Leave verified backup and any incomplete stage for explicit recovery; never erase originals.
  const stage = to + '.migration-' + randomUUID();
  await mkdir(stage, { recursive: false });
  await secureDirectory(stage);
  await copyInventory(backup, stage, files);
  const index = path.join(stage, 'history', 'index.json');
  try {
    const history = JSON.parse(await readFile(index, 'utf8'));
    if (!Array.isArray(history.items)) throw fail('Invalid history index.');
    for (const item of history.items) {
      if (typeof item.source === 'string' && path.isAbsolute(item.source) && within(from, item.source)) item.source = path.join(to, path.relative(from, item.source));
    }
    await writeFile(index, JSON.stringify(history));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(path.join(stage, 'data-schema.json'), JSON.stringify({ version: DATA_SCHEMA, migratedAt: new Date().toISOString(), previousVersion: 0 }));
  await writeFile(path.join(stage, 'migration-record.json'), JSON.stringify({ from, backup, files, note: 'Same-account file backup; CA private key remains in the Windows certificate store. WebView theme is preserved by profile copy, pending real WebView acceptance.' }));
  await beforeCommit();
  if (JSON.stringify(await inventory(from)) !== JSON.stringify(files)) throw fail('Legacy data changed during migration. Original and backup retained; stage not activated.');
  await absent(to);
  await rename(stage, to);
  return { schemaVersion: DATA_SCHEMA, fileCount: files.length, byteCount: files.reduce((sum, file) => sum + file.bytes, 0), originalRetained: true, backupVerified: true };
}
