import { mkdir, readdir, lstat, readFile, writeFile, rename, unlink, rmdir, statfs, rm } from 'node:fs/promises';
import path from 'node:path';
import { assertNoLinks, within } from './runtime-context.js';

async function usage(root) {
  let bytes = 0;
  try {
    if ((await lstat(root)).isSymbolicLink()) return 0;
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const target = path.join(root, entry.name), info = await lstat(target);
      if (info.isSymbolicLink()) continue;
      if (info.isFile()) bytes += info.size;
      else if (info.isDirectory()) bytes += await usage(target);
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return bytes;
}
export async function cleanStaging(root, instanceId, { now = Date.now(), maxAgeMs = 24 * 60 * 60 * 1000 } = {}) {
  await assertNoLinks(root); let removed = 0;
  const entries = await readdir(root, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^upload-[a-zA-Z0-9]{6}$/.test(entry.name)) continue;
    const target = path.join(root, entry.name); await assertNoLinks(target);
    let owner; try { owner = JSON.parse(await readFile(path.join(target, '.owner.json'), 'utf8')); } catch { continue; }
    if (owner.application !== 'PanoKopru' || owner.instanceId !== instanceId || !Number.isFinite(owner.createdAt) || now - owner.createdAt < maxAgeMs) continue;
    const children = await readdir(target, { withFileTypes: true });
    if (children.some(item => !item.isFile() || !['payload', '.owner.json'].includes(item.name))) continue;
    // Validated direct child with matching ownership; never a user/source directory.
    await rm(target, { recursive: true, force: true }); removed++;
  }
  return { removed };
}
export async function createStorage(root, history, { now = () => Date.now() } = {}) {
  await assertNoLinks(root); await mkdir(root, { recursive: true });
  const index = path.join(root, 'storage-index.json');
  let data = { version: 1, retentionDays: 0, files: [] }, pending = Promise.resolve(), cached, cacheTime = 0;
  try { data = JSON.parse(await readFile(index, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (data.version !== 1 || ![0,7,30,90].includes(data.retentionDays) || !Array.isArray(data.files)) throw new Error('Invalid storage index.');
  const queue = action => { const task = pending.then(action); pending = task.catch(() => {}); return task; };
  const persist = async () => { await writeFile(index + '.next', JSON.stringify(data)); await rename(index + '.next', index); cached = null; };
  function ownedTarget(relative) {
    if (typeof relative !== 'string' || !/^inbox\/[0-9]+-[a-f0-9]{8}\/[^/\\]+$/.test(relative)) throw new Error('Invalid managed file path.');
    const target = path.join(root, relative);
    if (!within(path.join(root, 'inbox'), target)) throw new Error('File outside owned inbox.');
    return target;
  }
  return {
    register: target => queue(async () => {
      const relative = path.relative(root, target).replaceAll('\\', '/'); ownedTarget(relative); await assertNoLinks(target);
      if (!data.files.some(file => file.relative === relative)) data.files.push({ relative, createdAt: now() });
      await persist();
    }),
    policy: retentionDays => queue(async () => { if (![0,7,30,90].includes(retentionDays)) throw Object.assign(new Error('Geçersiz saklama süresi.'), { statusCode: 400 }); data.retentionDays = retentionDays; await persist(); }),
    async summary() {
      if (cached && now() - cacheTime < 30000) return cached;
      const areas = {}; for (const name of ['history','inbox','outbox','temp']) areas[name] = await usage(path.join(root, name));
      const fs = await statfs(root).catch(() => null);
      cached = { ...areas, totalBytes: await usage(root), freeBytes: fs ? fs.bavail * fs.bsize : null, historyBudgetBytes: 256 * 1024 ** 2, retentionDays: data.retentionDays, managedFiles: data.files.length };
      cacheTime = now(); return cached;
    },
    cleanup: ({ confirmed } = {}) => queue(async () => {
      if (confirmed !== true) throw Object.assign(new Error('Dosya temizliği için onay gerekiyor.'), { statusCode: 400 });
      if (!data.retentionDays) return { removed: 0, retainedForever: true };
      return history.withSourceProtection(async protectedFiles => {
      let removed = 0; const remaining = [];
      for (const file of data.files) {
        const target = ownedTarget(file.relative);
        if (!Number.isFinite(file.createdAt) || now() - file.createdAt < data.retentionDays * 86400000 || protectedFiles.has(path.resolve(target).toLowerCase())) { remaining.push(file); continue; }
        await assertNoLinks(target);
        const info = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
        if (info && !info.isFile()) throw new Error('Managed path is not a regular file.');
        if (info) { await unlink(target); removed++; }
        await rmdir(path.dirname(target)).catch(() => {});
      }
      data.files = remaining; await persist(); return { removed };
      });
    })
  };
}
