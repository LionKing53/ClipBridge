import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { canTrust, networkKey, matchesApprovedNetwork } from './network-policy.js';
import { sameSubnet } from './local-network.js';
import { assertRuntimeContext, assertNoLinks } from './runtime-context.js';
import { operationError } from './errors.js';
const fail = message => Object.assign(new Error(message), { statusCode: 409 });

export async function createOnboarding({ context, networkReader, prepareIdentity, grantPermission, readCertificate, startBootstrap, activate, isConfigured }) {
  assertRuntimeContext(context);
  await assertNoLinks(context.dataRoot);
  for (const callback of [networkReader, prepareIdentity, grantPermission, readCertificate, startBootstrap, activate, isConfigured]) if (typeof callback !== 'function') throw new Error('Complete onboarding adapters required.');
  const file = path.join(context.dataRoot, 'setup-state.json');
  let state = { phase: 'not_started' }, transport, expectedFingerprint, busy = false, closed = false, closing;
  const pending = new Set();
  const checkpoint = () => { if (closed) throw fail('Uygulama kapanıyor.'); };
  try { state = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!['not_started', 'complete', 'interrupted'].includes(state.phase)) state = { phase: 'interrupted' };
  const save = async value => { await writeFile(file + '.next', JSON.stringify(value)); await rename(file + '.next', file); state = value; };
  const status = () => ({ ...state, busy, available: !isConfigured(), ...(transport ? { downloadUrl: transport.url, fingerprint: expectedFingerprint, expiresAt: transport.expiresAt } : {}) });
  const actions = {
    status,
    async networks() { return (await networkReader()).filter(canTrust).map(net => ({ key: networkKey(net), name: net.name, interfaceAlias: net.interfaceAlias, category: net.category })); },
    async begin({ key, confirmed }) {
      if (confirmed !== true || busy || !status().available || !/^[a-f0-9]{32}$/.test(key || '')) throw fail('Ağ seçimini ve Windows Özel ağ değişikliğini onayla.');
      busy = true;
      try {
        await transport?.close(); transport = null;
        const selected = (await networkReader()).find(net => canTrust(net) && networkKey(net) === key);
        if (!selected) throw operationError('ERR_NETWORK_CHANGED');
        await save({ phase: 'preparing' });
        await prepareIdentity(selected); checkpoint();
        await grantPermission(selected); checkpoint();
        const current = (await networkReader()).find(net => canTrust(net) && matchesApprovedNetwork(selected, net) && net.category === 'Private');
        if (!current) throw operationError('ERR_NETWORK_CHANGED');
        const certificate = await readCertificate(); checkpoint(); expectedFingerprint = new X509Certificate(certificate).fingerprint256;
        transport = await startBootstrap({ context, certificate, address: current.address, isAllowed: async req => {
          const active = (await networkReader()).find(net => matchesApprovedNetwork(current, net) && net.category === 'Private' && net.address === current.address);
          return !!active && sameSubnet(req.socket.remoteAddress, active.address, active.prefixLength);
        } });
        checkpoint(); await save({ phase: 'certificate' }); busy = false; return status();
      } catch (error) { await transport?.close(); transport = null; await save({ phase: 'interrupted' }); throw error; }
      finally { busy = false; }
    },
    async confirm({ fingerprintFromPhone, confirmedTrust }) {
      if (busy || !transport || state.phase !== 'certificate' || Date.now() >= transport.expiresAt) throw operationError('ERR_CERTIFICATE_SESSION');
      const normalize = value => String(value || '').replace(/[:\s]/g, '').toUpperCase();
      if (confirmedTrust !== true || normalize(fingerprintFromPhone) !== normalize(expectedFingerprint)) throw operationError('ERR_FINGERPRINT_MISMATCH');
      busy = true;
      try { await transport.close(); transport = null; checkpoint(); await activate(); checkpoint(); await save({ phase: 'complete', phoneEndToEndVerified: false }); busy = false; return status(); }
      catch (error) { await save({ phase: 'interrupted' }); throw error; }
      finally { busy = false; }
    },
    async cancel() { if (busy || isConfigured()) throw fail('Çalışan kurulum veya devam eden Windows işlemi bu düğmeyle iptal edilemez.'); await transport?.close(); transport = null; await save({ phase: 'interrupted' }); }
  };
  return {
    status, networks: actions.networks,
    ...Object.fromEntries(['begin', 'confirm', 'cancel'].map(name => [name, (...args) => {
      if (closed) return Promise.reject(fail('Uygulama kapanıyor.'));
      const task = Promise.resolve().then(() => { checkpoint(); return actions[name](...args); });
      pending.add(task); void task.then(() => pending.delete(task), () => pending.delete(task)); return task;
    }])),
    close() {
      closed = true;
      return closing ||= (async () => {
        await Promise.allSettled([...pending]);
        await transport?.close(); transport = null;
        if (!['not_started', 'complete', 'interrupted'].includes(state.phase)) await save({ phase: 'interrupted' });
      })();
    }
  };
}
