import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createNetworkManager } from '../src/network-manager.js';
import { approvedNetworks, networkKey } from '../src/network-policy.js';
import { trustedHome, hasNetworkPermission } from '../src/local-network.js';

const home = { id: '{11111111-1111-1111-1111-111111111111}', name: 'Ev', interfaceAlias: 'WLAN', interfaceDescription: 'Wireless', category: 'Private', address: '192.168.1.2', prefixLength: 24 };
const phone = { ...home, name: 'Telefon', category: 'Public', address: '172.20.10.2' };
async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-network-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = { home, additionalNetworks: [], enabled: true, hostname: 'panokopru-1234abcd.local', port: 32147 };
  await writeFile(path.join(root, 'config.json'), JSON.stringify(config));
  let connected = [home], calls = 0, changes = 0;
  const manager = await createNetworkManager({ root, networkReader: async () => connected,
    permissionRunner: options.permissionRunner || (async () => { calls++; connected = connected.map(net => ({ ...net, category: 'Private' })); }),
    cleanupRunner: options.cleanupRunner || (async () => {}), onChange: () => { changes++; } });
  return { manager, root, setConnected: nets => { connected = nets; }, calls: () => calls, changes: () => changes };
}
test('network manager adds only connected exact records, retains existing trust and persists atomically', async t => {
  const f = await fixture(t); f.setConnected([phone]);
  await f.manager.trust(networkKey(phone));
  assert.equal(f.calls(), 1); assert.equal(f.changes(), 1);
  assert.equal(approvedNetworks(f.manager.config()).length, 2);
  const saved = JSON.parse(await readFile(path.join(f.root, 'config.json'), 'utf8'));
  assert.equal(saved.hostname, 'panokopru-1234abcd.local');
  assert.equal(saved.trustedNetworks[1].permissionGranted, true);
  assert.equal(trustedHome(saved, [{ ...phone, category: 'Private' }]).name, 'Telefon');
  assert.equal(hasNetworkPermission(saved, { ...phone, category: 'Private' }, undefined), true);
});
test('empty trusted list takes precedence over legacy home and removal immediately signals listener revocation', async t => {
  const f = await fixture(t);
  await f.manager.remove(networkKey(home));
  assert.equal(f.changes(), 1); assert.equal(f.calls(), 0);
  assert.deepEqual(approvedNetworks(f.manager.config()), []);
  assert.equal(trustedHome(f.manager.config(), [home]), undefined);
  const restored = await createNetworkManager({ root: f.root, networkReader: async () => [home] });
  assert.equal((await restored.inspect()).connected[0].trusted, false);
  await assert.rejects(restored.remove(networkKey(home)), { statusCode: 404 });
});
test('unknown keys, disconnected networks, public IPs and managed networks cannot be trusted', async t => {
  const f = await fixture(t);
  await assert.rejects(f.manager.trust('../../other'), { statusCode: 400 });
  await assert.rejects(f.manager.trust(networkKey(phone)), { statusCode: 409 });
  for (const net of [{ ...phone, address: '8.8.8.8' }, { ...phone, category: 'DomainAuthenticated' }, { ...phone, interfaceAlias: '*' }]) {
    f.setConnected([net]); await assert.rejects(f.manager.trust(networkKey(net)), { statusCode: 409 });
  }
  assert.equal(f.calls(), 0); assert.equal(approvedNetworks(f.manager.config()).length, 1);
});
test('UAC cancellation leaves persisted trust and previous networks unchanged', async t => {
  const f = await fixture(t, { permissionRunner: async () => { throw new Error('cancelled'); } });
  f.setConnected([phone]);
  await assert.rejects(f.manager.trust(networkKey(phone)), /cancelled/);
  assert.equal(f.manager.operation(), null); assert.equal(f.changes(), 0);
  assert.equal(approvedNetworks(f.manager.config()).length, 1);
});
test('network change during permission and concurrent operations fail closed', async t => {
  let release;
  const f = await fixture(t, { permissionRunner: () => new Promise(resolve => { release = resolve; }) });
  f.setConnected([phone]);
  const pending = f.manager.trust(networkKey(phone));
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(f.manager.remove(networkKey(home)), { statusCode: 409 });
  f.setConnected([home]); release();
  await assert.rejects(pending, /ağ değişti/);
  assert.equal(f.changes(), 0); assert.equal(f.manager.operation(), null);
});
test('same adapter and changed name cannot inherit trust; repair does not duplicate rows', async t => {
  const f = await fixture(t); await f.manager.trust(networkKey(home));
  assert.equal(approvedNetworks(f.manager.config()).length, 1);
  f.setConnected([{ ...home, name: 'Untrusted Campus' }]);
  assert.equal((await f.manager.inspect()).connected[0].trusted, false);
});

test('permission cleanup revokes access before UAC and remains closed after cancellation', async t => {
  const f = await fixture(t, { cleanupRunner: async () => {
    assert.equal(f.manager.config().permissionsRevoked, true);
    assert.equal(hasNetworkPermission(f.manager.config(), home, { ok: true }), false);
    throw new Error('cancelled');
  } });
  await assert.rejects(f.manager.cleanupPermissions(), /cancelled/);
  assert.equal(f.manager.operation(), null);
  assert.equal(approvedNetworks(f.manager.config()).length, 1);
  assert.equal(f.changes(), 1);
  await f.manager.trust(networkKey(home));
  assert.equal(hasNetworkPermission(f.manager.config(), home, undefined), true);
});
