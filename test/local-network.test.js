import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIPv4, sameSubnet, trustedHome, hasNetworkPermission } from '../src/local-network.js';
import { createServer } from '../src/app.js';

test('local network accepts only valid RFC1918 IPv4 subnets', () => {
  for (const ip of ['192.168.1.5', '10.5.2.4', '172.16.2.4', '172.31.255.254']) assert.equal(isPrivateIPv4(ip), true);
  for (const ip of ['127.0.0.1', '0.0.0.0', '8.8.8.8', '100.64.0.10', '192.168.1.500', '172.32.0.1', 'example.com', undefined]) assert.ok(!isPrivateIPv4(ip));
  assert.equal(sameSubnet('192.168.1.40', '192.168.1.5', 24), true);
  assert.equal(sameSubnet('192.168.2.40', '192.168.1.5', 24), false);
  assert.equal(sameSubnet('100.64.0.11', '192.168.1.5', 24), false);
  assert.equal(sameSubnet('192.168.1.40', '192.168.1.5', 0), false);
});
test('home selection fails closed for public, unknown, spoofed name-only and absent networks', () => {
  const config = { home: { id: '{test-id}', name: 'approved-home' } };
  const home = { id: '{TEST-ID}', name: 'approved-home', category: 'Private', address: '192.168.1.5' };
  assert.deepEqual(trustedHome(config, [home], { ok: true }), home);
  for (const entry of [{ ...home, category: 'Public' }, { ...home, id: '{different}' }, { ...home, name: 'other-network' }, { ...home, address: '8.8.8.8' }]) assert.equal(trustedHome(config, [entry]), undefined);
  assert.equal(trustedHome(config, []), undefined);
});
test('additional USB network is explicit, adapter-bound and does not replace home', () => {
  const home = { id: '{home}', name: 'home', interfaceAlias: 'WLAN', category: 'Private', address: '192.168.1.5' };
  const usb = { id: '{usb}', name: 'phone', interfaceAlias: 'Ethernet 3', interfaceDescription: 'Apple Mobile Device Ethernet', category: 'Private', address: '172.20.10.4' };
  const config = { home, additionalNetworks: [usb] };
  assert.equal(trustedHome(config, [usb], { ok: true, approvedNetworks: [usb] }), usb);
  assert.equal(trustedHome(config, [usb, home], { ok: true, approvedNetworks: [usb, home] }), home);
  assert.equal(trustedHome({ home }, [usb]), undefined);
  for (const changes of [{ category: 'Public' }, { id: '{other}' }, { name: 'Untrusted Campus' }, { interfaceAlias: 'WLAN' }, { interfaceDescription: 'Other adapter' }]) {
    assert.equal(trustedHome(config, [{ ...usb, ...changes }]), undefined);
  }
  assert.equal(hasNetworkPermission(config, usb, { ok: true }), false);
  assert.equal(hasNetworkPermission(config, home, { ok: true }), true);
  assert.equal(hasNetworkPermission(config, usb, { ok: true, approvedProfileIds: ['{home}'] }), false);
  assert.equal(hasNetworkPermission(config, usb, { ok: true, approvedProfileIds: ['{USB}'] }), true);
  assert.equal(hasNetworkPermission(config, usb, { ok: false, approvedProfileIds: ['{usb}'] }), false);
});
test('shared Wi-Fi adapter does not grant another network permission by adapter ID alone', () => {
  const home = { id: '{wifi}', name: 'home', interfaceAlias: 'WLAN', category: 'Private', address: '192.168.1.5' };
  const phone = { ...home, name: 'phone', address: '172.20.10.6' };
  const config = { home, additionalNetworks: [phone] };
  assert.equal(trustedHome(config, [phone], { ok: true, approvedNetworks: [phone] }), phone);
  assert.equal(trustedHome(config, [home], { ok: true, approvedNetworks: [home] }), home);
  assert.equal(trustedHome(config, [{ ...phone, name: 'Untrusted Campus' }]), undefined);
  assert.equal(hasNetworkPermission(config, phone, { ok: true, approvedProfileIds: ['{wifi}'] }), false);
  assert.equal(hasNetworkPermission(config, phone, { ok: true, approvedNetworks: [home] }), false);
  assert.equal(hasNetworkPermission(config, phone, { ok: true, approvedNetworks: [home, phone] }), true);
});
test('transport guard protects every endpoint before clipboard access or setup', async t => {
  let reads = 0, extras = 0;
  const server = createServer({ token: 'test', transportGuard: () => false, getClipboard: async () => { reads++; return 'secret'; }, handleExtraRequest: async () => { extras++; return false; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  for (const route of ['/health', '/setup', '/api/v1/clipboard', '/api/v1/clipboard/kind']) {
    assert.equal((await fetch(`http://127.0.0.1:${server.address().port}${route}`, { headers: { Authorization: 'Bearer test' } })).status, 403);
  }
  assert.equal(reads, 0); assert.equal(extras, 0);
});
