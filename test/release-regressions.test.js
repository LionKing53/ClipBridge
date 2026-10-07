import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../src/app.js';
import { createLocalServices } from '../src/local-services.js';
import { createHistory } from '../src/history.js';
import { createStorage } from '../src/storage.js';
import { trustedHome } from '../src/local-network.js';
import { networkKey } from '../src/network-policy.js';
import { resolveRuntime } from '../src/runtime-context.js';
import { testCA } from './support/public-ca.js';
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const net = { id: '{11111111-1111-1111-1111-111111111111}', name: 'Demo Home', interfaceAlias: 'WLAN', interfaceDescription: 'Demo', category: 'Private', address: '192.168.50.2', prefixLength: 24 };
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-regression-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = resolveRuntime({ env: { LOCALAPPDATA: path.join(root, 'Local'), PANOKOPRU_MODE: 'test', PANOKOPRU_DATA_ROOT: path.join(root, 'data'), PANOKOPRU_API_PORT: '45145', PANOKOPRU_DESKTOP_PORT: '45146', PANOKOPRU_LOCAL_PORT: '45147' } });
  await mkdir(context.dataRoot);
  return { context, root: context.dataRoot };
}
async function localFixture(t, overrides = {}) {
  const { context, root } = await fixture(t); let cleanups = 0, boots = 0, open = false;
  const adapters = {
    factory: async () => ({ status: () => ({ configured: false }), close: async () => {}, handleSetup: async () => false }),
    networkReader: async () => [net],
    prepareIdentity: async () => { await mkdir(path.join(root, 'lan'), { recursive: true }); await writeFile(path.join(root, 'lan/config.json'), JSON.stringify({ setupPending: true })); },
    manager: async () => ({ trust: async () => {}, cleanupPermissions: async () => { cleanups++; return { ok: true }; } }),
    readCertificate: async () => testCA,
    startBootstrap: async () => { boots++; open = true; return { url: 'http://example.invalid/certificate/demo.cer', expiresAt: Date.now()+120000, close: async () => { open = false; } }; }, ...overrides
  };
  const service = await createLocalServices(context, {}, adapters); t.after(() => service.close());
  return { service, root, counts: () => ({ cleanups, boots, open }) };
}
test('shutdown drains an in-flight clipboard write after aborting its HTTP connection', async () => {
  const entered = deferred(), finish = deferred(); let written = false;
  const server = createServer({ token: 'synthetic', setClipboardItem: async () => { entered.resolve(); await finish.promise; written = true; return { type: 'text' }; }, logger: { info() {}, error() {} } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const request = fetch(`http://127.0.0.1:${server.address().port}/api/v1/clipboard`, { method: 'POST', headers: { Authorization: 'Bearer synthetic', 'Content-Type': 'text/plain' }, body: 'synthetic' }).catch(() => null);
  await entered.promise;
  let stopped = false; const close = server.closeAndDrain().then(() => { stopped = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(stopped, false);
  finish.resolve(); await close; await request; assert.equal(written, true); assert.equal(server.listening, false);
});
test('shutdown during permission grant waits for it and cannot reopen bootstrap afterwards', async t => {
  const entered = deferred(), finish = deferred();
  const f = await localFixture(t, { manager: async () => ({ trust: async () => { entered.resolve(); await finish.promise; } }) });
  const begin = f.service.setup.begin({ key: networkKey(net), confirmed: true });
  const rejected = assert.rejects(begin); await entered.promise;
  let stopped = false; const close = f.service.close().then(() => { stopped = true; });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(stopped, false);
  finish.resolve(); await rejected; await close;
  assert.equal(f.counts().boots, 0); assert.equal(f.service.setup.status().phase, 'interrupted');
  assert.throws(() => f.service.setup.begin({ key: networkKey(net), confirmed: true }), /kapanıyor/);
});
test('interrupted first setup retains UI permission cleanup before TLS activation', async t => {
  const f = await localFixture(t);
  await f.service.setup.begin({ key: networkKey(net), confirmed: true });
  assert.equal(f.service.status().configured, false);
  assert.equal(f.service.status().canCleanupPermissions, true);
  await f.service.cleanupPermissions();
  assert.deepEqual(f.counts(), { cleanups: 1, boots: 1, open: false });
  assert.equal(f.service.setup.status().phase, 'interrupted');
});
test('shutdown during TLS activation closes the late listener and never rebuilds it', async t => {
  const entered = deferred(), finish = deferred(); let calls = 0, opened = false;
  const f = await localFixture(t, { factory: async () => {
    calls++;
    if (calls === 2) { entered.resolve(); await finish.promise; opened = true; }
    const configured = calls > 1;
    return { status: () => ({ configured, state: configured ? 'ready' : 'not_configured' }), close: async () => { opened = false; }, handleSetup: () => false };
  } });
  const setup = await f.service.setup.begin({ key: networkKey(net), confirmed: true });
  const confirm = f.service.setup.confirm({ fingerprintFromPhone: setup.fingerprint, confirmedTrust: true });
  const rejected = assert.rejects(confirm); await entered.promise;
  const close = f.service.close(); finish.resolve(); await rejected; await close;
  assert.equal(calls, 2); assert.equal(opened, false);
  const config = JSON.parse(await readFile(path.join(f.root, 'lan/config.json'), 'utf8'));
  assert.equal(config.setupPending, true); assert.equal(config.enabled, false);
});
test('favorite and cleanup serialize: earlier favorite survives, removed file cannot become favorite', async t => {
  const { root } = await fixture(t); const history = await createHistory(root); let now = 1000000000000;
  const storage = await createStorage(root, history, { now: () => now });
  const file = path.join(root, 'inbox/1-1234abcd/demo.pdf'); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, 'synthetic');
  await storage.register(file); const id = await history.record({ type: 'file', path: file, filename: 'demo.pdf' }, 'inbound');
  await storage.policy(7); now += 10 * 86400000;
  const favorite = history.favorite(id); const cleanup = storage.cleanup({ confirmed: true });
  await favorite; assert.equal((await cleanup).removed, 0); assert.ok((await stat(file)).isFile());
  await history.favorite(id); assert.equal((await storage.cleanup({ confirmed: true })).removed, 1);
  await assert.rejects(history.favorite(id), { statusCode: 409 }); assert.equal(history.detail(id).favorite, false);
});
test('multiple connected networks skip an earlier unpermitted network and select the authorized one', () => {
  const second = { ...net, id: '{22222222-2222-2222-2222-222222222222}', name: 'Demo Ethernet', interfaceAlias: 'Ethernet', address: '192.168.60.2' };
  const config = { enabled: true, trustedNetworks: [{ ...net, permissionGranted: false }, { ...second, permissionGranted: true }] };
  assert.equal(trustedHome(config, [net, second]), second);
  assert.equal(trustedHome(config, [net]), undefined);
  assert.equal(trustedHome(config, [{ ...second, category: 'Public' }]), undefined);
});
