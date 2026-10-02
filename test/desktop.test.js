import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHistory } from '../src/history.js';
import { createDesktopServer } from '../src/desktop-server.js';
import { createServer } from '../src/app.js';
import sharp from 'sharp';
import http from 'node:http';
import { createTestSystem, fixtureMachine } from './support/desktop-system.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-desktop-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, history: await createHistory(root) };
}
test('history preserves Unicode, persists, favorites, pauses, and deduplicates', async t => {
  const { root, history } = await fixture(t);
  const item = { type: 'text', content: 'Türkçe: ığüşöç İĞÜŞÖÇ 🌿 <script>alert(1)</script>' };
  const id = await history.record(item, 'inbound');
  await history.record(item, 'inbound');
  assert.equal(history.list().items.length, 1);
  await history.favorite(id);
  const restored = await createHistory(root);
  assert.equal(restored.detail(id).content, item.content);
  assert.equal(restored.detail(id).favorite, true);
  await history.settings({ enabled: false });
  await history.record({ type: 'text', content: 'saklanmamalı' }, 'inbound');
  assert.equal(history.list().items.length, 1);
  await history.remove(id);
  assert.equal(history.list().items.length, 0);
});
test('history snapshots images with extension, thumbnails, and never deletes original files', async t => {
  const { root, history } = await fixture(t);
  const png = await sharp({ create: { width: 30, height: 30, channels: 3, background: '#b8efd2' } }).png().toBuffer();
  const id = await history.record({ type: 'image', data: png, filename: 'örnek.png', mimeType: 'image/png' }, 'outbound');
  const owned = history.detail(id).source;
  assert.equal(path.extname(owned), '.png');
  assert.deepEqual(await readFile(owned), png);
  assert.ok((await stat(history.thumbnail(id))).size > 0);
  const source = path.join(root, 'original.pdf'); await writeFile(source, 'original');
  await history.record({ type: 'file', path: source, filename: 'original.pdf' }, 'inbound');
  await history.clear();
  assert.equal(await readFile(source, 'utf8'), 'original');
  await assert.rejects(stat(owned), { code: 'ENOENT' });
});
test('history limit and concurrent writes are serialized', async t => {
  const { root, history } = await fixture(t);
  await history.settings({ limit: 50 });
  await Promise.all(Array.from({ length: 60 }, (_, i) => history.record({ type: 'text', content: 'Kayıt ' + i }, 'local')));
  assert.equal(history.list().items.length, 50);
  assert.equal((await createHistory(root)).list().items.length, 50);
});
test('desktop API denies missing tokens, foreign origins and hosts; actions require auth', async t => {
  const { root, history } = await fixture(t);
  const server = await createDesktopServer({ system: createTestSystem(), config: { configPath: path.join(root, 'config.json'), token: 'private-phone-token' }, history, transfers: { getItem: async () => ({ type: 'text', content: 'Test' }) } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const token = await readFile(path.join(root, 'desktop-token'), 'utf8');
  const headers = { Authorization: 'Bearer ' + token };
  const state = await (await fetch(origin + '/api/state', { headers })).json();
  assert.equal(state.machine, fixtureMachine);
  assert.equal(state.network.dnsName, 'demo.example.invalid');
  assert.equal((await fetch(origin + '/api/state')).status, 401);
  assert.equal((await fetch(origin + '/api/state', { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  const foreignHostStatus = await new Promise((resolve, reject) => { const req = http.get(origin + '/api/state', { headers: { ...headers, Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); });
  assert.equal(foreignHostStatus, 403);
  const page = await fetch(origin); assert.equal(page.status, 200); assert.ok(!(await page.text()).includes(token));
  assert.equal((await fetch(origin + '/api/capture', { method: 'POST', headers })).status, 200);
  const id = history.list().items[0].id;
  const detail = await (await fetch(origin + '/api/items/' + id, { headers })).json(); assert.equal(detail.content, 'Test');
  assert.equal((await fetch(origin + '/api/items/' + id, { method: 'DELETE' })).status, 401);
  assert.equal(history.list().items.length, 1);
  assert.equal((await fetch(origin + '/api/items/' + id, { method: 'DELETE', headers })).status, 200);
});
test('only actual clipboard GET records history, not kind; observer failures do not break transfers', async t => {
  let calls = 0;
  const server = createServer({ token: 'test-token', getClipboardItem: async () => ({ type: 'text', content: 'Test' }), onClipboardSent: async () => { calls++; throw new Error('history unavailable'); }, logger: { info() {}, error() {} } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`; const headers = { Authorization: 'Bearer test-token' };
  assert.equal(await (await fetch(origin + '/api/v1/clipboard/kind', { headers })).text(), 'text'); assert.equal(calls, 0);
  assert.equal(await (await fetch(origin + '/api/v1/clipboard', { headers })).text(), 'Test'); assert.equal(calls, 1);
});

test('network management requires desktop auth, same origin, explicit confirmation and a server-side key', async t => {
  const { root, history } = await fixture(t); const calls = [];
  const key = 'a'.repeat(32);
  const server = await createDesktopServer({ system: createTestSystem(), config: { configPath: path.join(root, 'config.json'), token: 'phone-token' }, history, transfers: {}, localNetwork: {
    inspectNetworks: async () => ({ connected: [{ key, name: 'Ev' }] }),
    trustNetwork: async value => { calls.push(['trust', value]); return { ok: true }; },
    removeNetwork: async value => { calls.push(['remove', value]); return { ok: true }; }
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const token = await readFile(path.join(root, 'desktop-token'), 'utf8');
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  for (const route of ['trust', 'remove']) {
    assert.equal((await fetch(origin + '/api/networks/' + route, { method: 'POST', body: JSON.stringify({ key, confirmed: true }) })).status, 401);
    assert.equal((await fetch(origin + '/api/networks/' + route, { method: 'POST', headers: { ...headers, Origin: 'https://foreign.invalid' }, body: JSON.stringify({ key, confirmed: true }) })).status, 403);
    assert.equal((await fetch(origin + '/api/networks/' + route, { method: 'POST', headers, body: JSON.stringify({ key }) })).status, 400);
    assert.equal((await fetch(origin + '/api/networks/' + route, { method: 'POST', headers, body: JSON.stringify({ key: 'Ev', confirmed: true }) })).status, 400);
    assert.equal((await fetch(origin + '/api/networks/' + route, { method: 'POST', headers, body: JSON.stringify({ key, confirmed: true }) })).status, 200);
  }
  assert.deepEqual(calls, [['trust', key], ['remove', key]]);
  assert.equal((await fetch(origin + '/api/networks')).status, 401);
  assert.equal((await fetch(origin + '/api/networks', { headers })).status, 200);
});
