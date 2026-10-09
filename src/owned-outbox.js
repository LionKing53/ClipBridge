import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile, lstat, readdir, unlink, rmdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { ZipArchive } from 'archiver';
import { assertRuntimeContext, assertNoLinks } from './runtime-context.js';

const day = 86400000;
const folderPattern = /^archive-[a-zA-Z0-9]{6}$/;
async function owned(context, directory, id) {
  const root = path.join(context.dataRoot, 'outbox');
  if (path.dirname(directory) !== root || !folderPattern.test(path.basename(directory))) return null;
  await assertNoLinks(directory);
  let names;
  try { names = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (names.some(entry => !entry.isFile() || !['.owner.json', 'payload.zip'].includes(entry.name))) return null;
  const marker = path.join(directory, '.owner.json');
  const info = await lstat(marker).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (!info?.isFile() || info.isSymbolicLink() || info.size > 4096 || info.nlink !== 1) return null;
  let owner;
  try { owner = JSON.parse(await readFile(marker, 'utf8')); } catch { return null; }
  if (owner.application !== 'ClipBridge-outbox' || owner.instanceId !== context.instanceId || !Number.isFinite(owner.createdAt)
      || !/^[a-f0-9-]{36}$/.test(owner.id || '') || (id && owner.id !== id)) return null;
  return { owner, names: names.map(entry => entry.name) };
}
async function removeOwned(context, directory, id) {
  const record = await owned(context, directory, id);
  if (!record) return false;
  // Only two exact validated files, no recursive deletion or original file path.
  for (const name of ['payload.zip', '.owner.json']) {
    if (!record.names.includes(name)) continue;
    const file = path.join(directory, name);
    await assertNoLinks(file);
    if (!(await lstat(file)).isFile()) throw new Error('Outbox ownership changed.');
    await unlink(file);
  }
  await rmdir(directory);
  return true;
}
export async function cleanOwnedOutbox(context, { now = Date.now() } = {}) {
  assertRuntimeContext(context);
  if (!Number.isFinite(now)) throw new Error('Invalid cleanup time.');
  const root = path.join(context.dataRoot, 'outbox');
  await assertNoLinks(root);
  const entries = await readdir(root, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !folderPattern.test(entry.name)) continue;
    const directory = path.join(root, entry.name);
    const record = await owned(context, directory);
    if (record && now - record.owner.createdAt >= day && await removeOwned(context, directory, record.owner.id)) removed++;
  }
  return { removed };
}
export async function createOwnedArchive(context, files) {
  assertRuntimeContext(context);
  if (!Array.isArray(files) || !files.length || files.some(file => !path.isAbsolute(file.path) || typeof file.name !== 'string' || !file.name || file.name === '.' || file.name === '..' || /[\\/\x00-\x1f]/.test(file.name))) throw new Error('Invalid archive inputs.');
  const root = path.join(context.dataRoot, 'outbox');
  await assertNoLinks(root); await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, 'archive-'));
  const id = randomUUID(), archivePath = path.join(directory, 'payload.zip');
  await writeFile(path.join(directory, '.owner.json'), JSON.stringify({ application: 'ClipBridge-outbox', instanceId: context.instanceId, id, createdAt: Date.now() }), { flag: 'wx' });
  const cleanup = () => removeOwned(context, directory, id);
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const output = createWriteStream(archivePath, { flags: 'wx' });
  archive.on('warning', error => archive.destroy(error)); // Missing files must not silently produce a partial archive.
  const finished = pipeline(archive, output);
  try {
    for (const file of files) archive.file(file.path, { name: file.name });
    await Promise.all([finished, archive.finalize()]);
    return { type: 'file', path: archivePath, filename: 'ClipBridge-Dosyalar.zip', mimeType: 'application/zip', temporary: true, cleanup };
  } catch (error) {
    archive.abort(); archive.destroy(); output.destroy();
    await finished.catch(() => {});
    await cleanup().catch(() => {});
    throw error;
  }
}
// A temporary boolean alone is not authority to delete an arbitrary file path.
export async function disposeTransfer(item) {
  if (item?.temporary && typeof item.cleanup === 'function') await item.cleanup();
}
