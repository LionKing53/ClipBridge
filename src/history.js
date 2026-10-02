import { mkdir, readFile, writeFile, rename, stat, copyFile, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

// Only application-owned snapshots are removed. Original and inbox files are never deleted.
export async function createHistory(stateRoot) {
  const root = path.join(stateRoot, 'history');
  await mkdir(root, { recursive: true });
  const index = path.join(root, 'index.json');
  let state = { settings: { enabled: true, limit: 100 }, items: [] };
  try { const saved = JSON.parse(await readFile(index, 'utf8')); if (Array.isArray(saved.items)) state = saved; } catch {}
  let pending = Promise.resolve();
  const queue = fn => { const next = pending.then(fn); pending = next.catch(() => {}); return next; };
  async function persist() {
    await writeFile(index + '.tmp', JSON.stringify(state), 'utf8');
    await rename(index + '.tmp', index);
  }
  async function removeOwned(item) {
    for (const suffix of ['.data', '.webp']) await unlink(path.join(root, item.id + suffix)).catch(() => {});
    const ownedDirectory = path.join(root, item.id);
    if (item.ownedBytes && item.source && path.dirname(item.source) === ownedDirectory) {
      await unlink(item.source).catch(() => {});
      await rmdir(ownedDirectory).catch(() => {});
    }
  }
  async function trim() {
    while (state.items.length > state.settings.limit || state.items.reduce((n, x) => n + (x.ownedBytes || 0), 0) > 256 * 1024 ** 2) {
      let i = state.items.findLastIndex(x => !x.favorite);
      if (i < 0) i = state.items.length - 1;
      await removeOwned(state.items.splice(i, 1)[0]);
    }
  }
  function get(id) {
    const item = state.items.find(x => x.id === id);
    if (!item) throw Object.assign(new Error('Kayıt bulunamadı.'), { statusCode: 404 });
    return item;
  }
  return {
    root,
    list: () => ({ settings: { ...state.settings }, items: state.items.map(({ source, content, ownedBytes, ...x }) => ({ ...x, preview: content?.slice(0, 300) })) }),
    detail: id => ({ ...get(id) }),
    thumbnail: id => { const item = get(id); return item.thumbnail ? path.join(root, item.id + '.webp') : null; },
    record: (item, direction) => queue(async () => {
      if (!state.settings.enabled || (item.type === 'text' && !item.content)) return;
      const size = item.type === 'text' ? Buffer.byteLength(item.content) : item.data?.length ?? (await stat(item.path)).size;
      const kind = item.type === 'text' ? 'text' : item.type === 'image' || item.mimeType?.startsWith('image/') ? 'image' : 'file';
      const previous = state.items[0];
      if (previous && previous.direction === direction && previous.type === kind && previous.size === size &&
          ((kind === 'text' && previous.content === item.content) || (item.path && previous.source === item.path))) {
        previous.createdAt = new Date().toISOString(); await persist(); return previous.id;
      }
      const row = { id: randomUUID(), type: kind, direction, createdAt: new Date().toISOString(), filename: item.filename || (kind === 'text' ? 'Metin' : 'Görsel.png'), mimeType: item.mimeType || 'text/plain', size, favorite: false };
      if (kind === 'text') {
        // Very large clipboard text still transfers normally; keep only a history preview.
        row.content = item.content.slice(0, 1024 * 1024);
        row.truncated = row.content.length !== item.content.length;
        row.ownedBytes = Buffer.byteLength(row.content);
      } else if (item.path && !item.temporary) {
        row.source = item.path;
      } else if (size <= 64 * 1024 ** 2) {
        const ownedDirectory = path.join(root, row.id);
        await mkdir(ownedDirectory);
        const filename = path.basename(row.filename).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 120) || 'dosya.bin';
        row.source = path.join(ownedDirectory, filename);
        if (item.path) await copyFile(item.path, row.source); else await writeFile(row.source, item.data);
        row.ownedBytes = size;
      }
      if (kind === 'image' && row.source) {
        try { await sharp(row.source, { limitInputPixels: 40_000_000 }).rotate().resize(640, 420, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(root, row.id + '.webp')); row.thumbnail = true; } catch {}
      }
      state.items.unshift(row);
      await trim(); await persist(); return row.id;
    }),
    favorite: id => queue(async () => { const item = get(id); item.favorite = !item.favorite; await persist(); }),
    remove: id => queue(async () => { const item = get(id); state.items = state.items.filter(x => x.id !== id); await persist(); await removeOwned(item); }),
    clear: () => queue(async () => { const old = state.items; state.items = []; await persist(); for (const item of old) await removeOwned(item); }),
    settings: value => queue(async () => {
      if (typeof value.enabled === 'boolean') state.settings.enabled = value.enabled;
      if ([50, 100, 250].includes(value.limit)) state.settings.limit = value.limit;
      await trim(); await persist();
    })
  };
}
