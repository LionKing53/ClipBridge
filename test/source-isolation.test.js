import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { createDesktopServer } from '../src/desktop-server.js';
import { createHistory } from '../src/history.js';
import { createTestSystem } from './support/desktop-system.js';
import { requestNetworkPermission } from '../src/network-manager.js';
import { getLocalNetworks } from '../src/local-network.js';

test('source config fails closed before reading or creating state', async () => {
  await assert.rejects(loadConfig(), { code: 'ERR_SOURCE_CHECKOUT' });
});

test('real network permissions are rejected before writing an operation or starting UAC', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-isolation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(requestNetworkPermission(root, {}), { code: 'ERR_SOURCE_CHECKOUT' });
  assert.deepEqual(await readdir(root), []);
  await assert.rejects(getLocalNetworks(), { code: 'ERR_SOURCE_CHECKOUT' });
});

test('desktop refuses real or incomplete adapters before creating tokens', async () => {
  await assert.rejects(createDesktopServer({}), { code: 'ERR_SOURCE_CHECKOUT' });
  await assert.rejects(createDesktopServer({ system: { hostname: () => 'DEMO-PC' } }), /Incomplete desktop system adapter/);
});

test('desktop copy and reveal use injected adapters only', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-isolation-'));
  const history = await createHistory(root);
  const calls = [];
  const system = createTestSystem({ copyText: async value => calls.push(['text', value]),
    copyFiles: async values => calls.push(['files', values]), reveal: async value => calls.push(['reveal', value]) });
  const textId = await history.record({ type: 'text', content: 'Synthetic clipboard' }, 'local');
  const original = path.join(root, 'demo.pdf');
  await writeFile(original, '%PDF-synthetic');
  const fileId = await history.record({ type: 'file', path: original, filename: 'demo.pdf' }, 'local');
  const server = await createDesktopServer({ system, config: { configPath: path.join(root, 'config.json') }, history, transfers: {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const headers = { Authorization: 'Bearer ' + await readFile(path.join(root, 'desktop-token'), 'utf8') };
  for (const [id, action] of [[textId, 'copy'], [fileId, 'copy'], [fileId, 'reveal']]) {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/items/${id}/${action}`, { method: 'POST', headers });
    assert.equal(res.status, 200); await res.json();
  }
  assert.equal(calls[0][1], 'Synthetic clipboard');
  assert.deepEqual(calls.map(call => call[0]), ['text', 'files', 'reveal']);
});
