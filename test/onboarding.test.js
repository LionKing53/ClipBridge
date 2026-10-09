import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { X509Certificate } from 'node:crypto';
import { startCertificateBootstrap } from '../src/certificate-bootstrap.js';
import { createOnboarding } from '../src/onboarding.js';
import { resolveRuntime } from '../src/runtime-context.js';
import { networkKey } from '../src/network-policy.js';
import { testCA } from './support/public-ca.js';
async function fixture(t) { const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-onboarding-')); t.after(() => rm(root, { recursive: true, force: true })); return { root, context: resolveRuntime({ env: { LOCALAPPDATA: path.join(root, 'local'), CLIPBRIDGE_MODE: 'test', CLIPBRIDGE_DATA_ROOT: path.join(root,'data'), CLIPBRIDGE_API_PORT:'44145', CLIPBRIDGE_DESKTOP_PORT:'44146', CLIPBRIDGE_LOCAL_PORT:'44147' } }) }; }
test('bootstrap exposes public CA only, rejects endpoints/origins/network changes and expires', async t => {
  const { context } = await fixture(t); let allowed = true, now = Date.now();
  const transport = await startCertificateBootstrap({ context, certificate: testCA, address: '127.0.0.1', isAllowed: () => allowed, port: 0, now: () => now });
  t.after(() => transport.close());
  const response = await fetch(transport.url); assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), testCA);
  assert.equal((await fetch(new URL('/api/v1/clipboard', transport.url))).status, 404);
  assert.equal((await fetch(transport.url, { headers: { Origin: 'https://foreign.invalid' } })).status, 403);
  allowed = false; assert.equal((await fetch(transport.url)).status, 403);
  allowed = true; now += 130000; assert.equal((await fetch(transport.url)).status, 410);
});
test('onboarding requires selected network and phone fingerprint before activation; no auto E2E claim', async t => {
  const { root, context } = await fixture(t); let activated = false, closed = false;
  await mkdir(context.dataRoot);
  // Journal location is synthetic and explicitly created; no real certificate store or UAC.
  const net = { id:'{11111111-1111-1111-1111-111111111111}', name:'Demo Home', interfaceAlias:'WLAN', interfaceDescription:'Demo', category:'Private', address:'192.168.50.2', prefixLength:24 };
  const controller = await createOnboarding({ context, networkReader: async () => [net], prepareIdentity: async () => {}, grantPermission: async () => {}, readCertificate: async () => testCA, isConfigured: () => false, activate: async () => { assert.equal(closed, true); activated = true; }, startBootstrap: async () => ({ url:'http://example.invalid/certificate/demo.cer', expiresAt: Date.now()+120000, close: async () => { closed = true; } }) });
  await assert.rejects(controller.begin({ key: networkKey(net) }));
  await controller.begin({ key: networkKey(net), confirmed: true });
  await assert.rejects(controller.confirm({ fingerprintFromPhone:'wrong', confirmedTrust:true })); assert.equal(activated,false);
  const result = await controller.confirm({ fingerprintFromPhone: new X509Certificate(testCA).fingerprint256, confirmedTrust:true });
  assert.equal(result.phase, 'complete'); assert.equal(result.phoneEndToEndVerified, false); assert.equal(activated,true);
});
