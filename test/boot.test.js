import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startBridge } from '../src/boot.js';
import { resolveRuntime, acquireInstance } from '../src/runtime-context.js';
import { createTestSystem } from './support/desktop-system.js';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-boot-'));
  const holders = []; const ports = [];
  for (let i = 0; i < 3; i++) { const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); holders.push(server); ports.push(String(server.address().port)); }
  await Promise.all(holders.map(server => new Promise(resolve => server.close(resolve))));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = resolveRuntime({ env: { LOCALAPPDATA: path.join(root, 'Local'), PANOKOPRU_MODE: 'test', PANOKOPRU_DATA_ROOT: path.join(root, 'state'), PANOKOPRU_API_PORT: ports[0], PANOKOPRU_DESKTOP_PORT: ports[1], PANOKOPRU_LOCAL_PORT: ports[2] } });
  const adapters = { logger: { info() {}, error() {} }, transfers: { getItem: async () => ({ type: 'text', content: 'Synthetic clipboard' }), setItem: async item => ({ type: item.type }) }, system: createTestSystem(), localNetwork: { status: () => ({ configured: false }), handleSetup: async () => false, close() {} } };
  return { context, adapters };
}
test('isolated whole-server boot uses distinct identity, private data and injected clipboard', async t => {
  const { context, adapters } = await fixture(t);
  await assert.rejects(startBridge(context), /explicit OS adapters/);
  const bridge = await startBridge(context, adapters); t.after(() => bridge.close());
  const base = 'http://127.0.0.1:' + context.ports.api;
  assert.equal((await (await fetch(base + '/health')).json()).instanceId, context.instanceId);
  assert.equal((await fetch(base + '/api/v1/clipboard')).status, 401);
  const token = JSON.parse(await readFile(path.join(context.dataRoot, 'config.json'), 'utf8')).token;
  assert.equal(await (await fetch(base + '/api/v1/clipboard', { headers: { Authorization: 'Bearer ' + token } })).text(), 'Synthetic clipboard');
  await assert.rejects(startBridge(context, adapters), { code: 'ERR_INSTANCE_LOCKED' });
  const firstClose = bridge.close();
  assert.equal(bridge.close(), firstClose, 'Concurrent shutdown callers await the same complete cleanup');
  await firstClose; const release = await acquireInstance(context); await release();
});
test('port collision shuts down partial startup and releases only its instance lock', async t => {
  const { context, adapters } = await fixture(t);
  const occupied = net.createServer(); await new Promise(resolve => occupied.listen(context.ports.desktop, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  await assert.rejects(startBridge(context, adapters), { code: 'EADDRINUSE' });
  const release = await acquireInstance(context); await release();
  assert.equal(occupied.listening, true);
});
