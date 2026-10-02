import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDesktopServer } from '../src/desktop-server.js';
import { createHistory } from '../src/history.js';
import { createTestSystem } from './support/desktop-system.js';
import { createStorage } from '../src/storage.js';

test('first-run, permission cleanup and storage endpoints enforce auth/origin and confirmations', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-setup-api-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const history = await createHistory(root); const storage = await createStorage(root, history);
  let cleaned = 0, begun = 0, confirmed = 0;
  const network = {
    status: () => ({ state: 'ready', endpoint: 'https://panokopru-1234abcd.local:32147/api/v1/clipboard' }),
    cleanupPermissions: async () => { cleaned++; return { ok: true }; },
    setup: {
      status: () => ({ phase: 'not_started', available: true }), networks: async () => [],
      begin: async input => { if (!input.confirmed) throw Object.assign(new Error('Confirmation required'), { statusCode: 400 }); begun++; },
      confirm: async () => { confirmed++; }, cancel: async () => {}
    }
  };
  const system = { ...createTestSystem(), network: async () => ({ connected: false }) };
  const server = await createDesktopServer({ system, config: { configPath: path.join(root, 'config.json'), token: 'synthetic-phone-key' }, history, transfers: {}, localNetwork: network, storage });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: 'Bearer ' + await readFile(path.join(root, 'desktop-token'), 'utf8') };
  for (const route of ['setup/begin', 'setup/confirm', 'setup/cancel', 'networks/cleanup', 'storage/cleanup', 'storage/policy']) {
    assert.equal((await fetch(origin + '/api/' + route, { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await fetch(origin + '/api/' + route, { method: 'POST', headers: { ...headers, Origin: 'https://foreign.invalid' }, body: '{}' })).status, 403);
  }
  const post = (route, body) => fetch(origin + '/api/' + route, { method: 'POST', headers, body: JSON.stringify(body) });
  assert.equal((await post('networks/cleanup', {})).status, 400); assert.equal(cleaned, 0);
  assert.equal((await post('networks/cleanup', { confirmed: true })).status, 200); assert.equal(cleaned, 1);
  assert.equal((await post('storage/cleanup', {})).status, 400);
  assert.equal((await post('storage/policy', { retentionDays: 1 })).status, 400);
  assert.equal((await post('storage/policy', { retentionDays: 30 })).status, 200);
  assert.equal((await post('setup/begin', { confirmed: true })).status, 200); assert.equal(begun, 1); assert.equal(confirmed, 0);
  assert.equal((await post('setup/cancel', {})).status, 400);
  assert.equal((await fetch(origin + '/api/pairing?transport=local', { headers })).status, 200);
  assert.equal((await fetch(origin + '/api/pairing', { headers })).status, 500);
});
