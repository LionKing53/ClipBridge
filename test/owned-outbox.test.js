import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveRuntime } from '../src/runtime-context.js';
import { createOwnedArchive, cleanOwnedOutbox, disposeTransfer } from '../src/owned-outbox.js';
import { createServer } from '../src/app.js';
import { createDesktopServer } from '../src/desktop-server.js';
import { createTestSystem } from './support/desktop-system.js';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-outbox-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = resolveRuntime({ env: { LOCALAPPDATA: path.join(root, 'profile'), CLIPBRIDGE_MODE: 'test', CLIPBRIDGE_DATA_ROOT: path.join(root, 'state'),
    CLIPBRIDGE_API_PORT: '41010', CLIPBRIDGE_DESKTOP_PORT: '41011', CLIPBRIDGE_LOCAL_PORT: '41012' } });
  const original = path.join(root, 'synthetic.txt'); await writeFile(original, 'Synthetic original');
  return { root, context, original, files: [{ path: original, name: 'synthetic.txt' }], outbox: path.join(context.dataRoot, 'outbox') };
}
test('owned archives have unique paths; idempotent disposal preserves the original', async t => {
  const { context, original, files, outbox } = await fixture(t);
  const [a, b] = await Promise.all([createOwnedArchive(context, files), createOwnedArchive(context, files)]);
  assert.notEqual(a.path, b.path);
  const zip = await readFile(a.path); assert.equal(zip.readUInt32LE(0), 0x04034b50); assert.ok(zip.includes(Buffer.from('synthetic.txt')));
  await disposeTransfer(a); await disposeTransfer(a); await disposeTransfer(b);
  assert.deepEqual(await readdir(outbox), []);
  assert.equal(await readFile(original, 'utf8'), 'Synthetic original');
});
test('outbox cleanup requires ownership and age, preserves legacy archives and foreign files', async t => {
  const { context, files, outbox } = await fixture(t);
  const old = await createOwnedArchive(context, files), foreign = await createOwnedArchive(context, files), modified = await createOwnedArchive(context, files);
  const marker = path.join(path.dirname(foreign.path), '.owner.json');
  const owner = JSON.parse(await readFile(marker)); owner.instanceId = 'different-instance'; await writeFile(marker, JSON.stringify(owner));
  await writeFile(path.join(path.dirname(modified.path), 'unmanaged.txt'), 'keep');
  await writeFile(path.join(outbox, 'ClipBridge-legacy.zip'), 'legacy');
  assert.equal((await cleanOwnedOutbox(context)).removed, 0);
  assert.equal((await cleanOwnedOutbox(context, { now: Date.now() + 2 * 86400000 })).removed, 1);
  await assert.rejects(readFile(old.path), { code: 'ENOENT' });
  assert.ok((await readFile(foreign.path)).length); assert.ok((await readFile(modified.path)).length);
  assert.equal(await readFile(path.join(outbox, 'ClipBridge-legacy.zip'), 'utf8'), 'legacy');
});
test('cleanup skips junction entries and rejects a linked outbox root', async t => {
  const { root, context, files, outbox } = await fixture(t);
  await mkdir(outbox, { recursive: true });
  const outside = path.join(root, 'outside'); await mkdir(outside); await writeFile(path.join(outside, 'keep.txt'), 'keep');
  await symlink(outside, path.join(outbox, 'archive-ABCDEF'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await cleanOwnedOutbox(context, { now: Date.now() + 2 * 86400000 })).removed, 0);
  await rm(path.join(outbox, 'archive-ABCDEF')); await rm(outbox, { recursive: true });
  await symlink(outside, outbox, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(cleanOwnedOutbox(context)); await assert.rejects(createOwnedArchive(context, files));
  assert.equal(await readFile(path.join(outside, 'keep.txt'), 'utf8'), 'keep');
});
test('failed archive construction cleans its partial output; invalid contexts and names fail', async t => {
  const { context, files, outbox, root } = await fixture(t);
  await assert.rejects(createOwnedArchive({ ...context }, files));
  await assert.rejects(createOwnedArchive(context, [{ ...files[0], name: '../bad' }]));
  await assert.rejects(createOwnedArchive(context, [{ path: path.join(root, 'missing.txt'), name: 'missing.txt' }]));
  assert.deepEqual(await readdir(outbox), []);
});
test('temporary flag alone never deletes an original, and changed ownership prevents disposal', async t => {
  const { context, files, original } = await fixture(t);
  await disposeTransfer({ temporary: true, path: original });
  assert.equal(await readFile(original, 'utf8'), 'Synthetic original');
  const item = await createOwnedArchive(context, files);
  const marker = path.join(path.dirname(item.path), '.owner.json');
  const owner = JSON.parse(await readFile(marker)); owner.id = '0'.repeat(36); await writeFile(marker, JSON.stringify(owner));
  await disposeTransfer(item); assert.ok((await readFile(item.path)).length);
});
test('GET content and kind dispose owned archives after use, including failed file stat', async t => {
  const { context, files, outbox } = await fixture(t);
  let absent = false, disposed = 0, recorded = 0;
  const server = createServer({ token: 'synthetic-token', logger: { info() {}, error() {} },
    getClipboardItem: async () => { const item = await createOwnedArchive(context, files); const cleanup = item.cleanup;
      if (absent) await rm(item.path);
      item.cleanup = async () => { disposed++; return cleanup(); }; return item; },
    onClipboardSent: async item => { assert.ok((await readFile(item.path)).length); recorded++; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = 'http://127.0.0.1:' + server.address().port + '/api/v1/clipboard';
  const options = { headers: { Authorization: 'Bearer synthetic-token' } };
  assert.equal(await (await fetch(url + '/kind', options)).text(), 'file');
  const response = await fetch(url, options); assert.equal(response.status, 200); await response.arrayBuffer();
  // Response can reach the client before the awaited history/cleanup finally ends.
  for (let i = 0; i < 100 && disposed < 2; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(disposed, 2); assert.equal(recorded, 1);
  absent = true; assert.equal((await fetch(url, options)).status, 500);
  assert.equal(disposed, 3); assert.deepEqual(await readdir(outbox), []);
});
test('desktop capture releases temporary archives even when history fails', async t => {
  const { context, files, outbox } = await fixture(t);
  await mkdir(context.dataRoot, { recursive: true });
  const server = await createDesktopServer({ config: { configPath: path.join(context.dataRoot, 'config.json'), token: 'synthetic-token' }, system: createTestSystem(),
    history: { record: async () => { throw new Error('synthetic history failure'); } }, transfers: { getItem: () => createOwnedArchive(context, files) } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const token = await readFile(path.join(context.dataRoot, 'desktop-token'), 'utf8');
  const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/capture', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
  assert.equal(response.status, 500); assert.deepEqual(await readdir(outbox), []);
});
