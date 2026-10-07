import path from 'node:path';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createLocalNetwork, prepareLocalNetwork, getLocalNetworks } from './local-network.js';
import { createNetworkManager } from './network-manager.js';
import { createOnboarding } from './onboarding.js';
import { startCertificateBootstrap } from './certificate-bootstrap.js';
import { networkKey } from './network-policy.js';
import { assertRuntimeContext } from './runtime-context.js';
import { assertProductionReady } from '../scripts/source-guard.js';

// Production composition only. Tests inject a complete facade into boot instead.
export async function createLocalServices(context, apiOptions, adapters) {
  assertRuntimeContext(context);
  if (context.mode === 'production') { assertProductionReady(); if (adapters) throw new Error('Production adapters are fixed.'); }
  else if (!adapters || ['factory','networkReader','prepareIdentity','manager','readCertificate'].some(key => typeof adapters[key] !== 'function') || typeof adapters.startBootstrap !== 'function') throw new Error('Complete isolated local-service adapters required.');
  const root = path.join(context.dataRoot, 'lan');
  const file = path.join(root, 'config.json');
  const factory = adapters?.factory || (() => createLocalNetwork({ stateRoot: context.dataRoot, apiOptions, port: context.ports.local }));
  const networkReader = adapters?.networkReader || getLocalNetworks;
  const managerFactory = adapters?.manager || (() => createNetworkManager({ root, networkReader }));
  let closed = false, closing, operation = null;
  const pending = new Set();
  const checkpoint = () => { if (closed) throw Object.assign(new Error('Uygulama kapanıyor.'), { statusCode: 503 }); };
  let active = await factory();
  const save = async config => { await writeFile(file + '.next', JSON.stringify(config, null, 2)); await rename(file + '.next', file); };
  const setup = await createOnboarding({
    context, networkReader, startBootstrap: adapters?.startBootstrap || startCertificateBootstrap,
    isConfigured: () => active.status().configured === true,
    prepareIdentity: async network => {
      await active.close(); checkpoint();
      if (adapters) await adapters.prepareIdentity(network);
      else await prepareLocalNetwork(context.dataRoot, network.id, { port: context.ports.local });
    },
    grantPermission: async network => {
      checkpoint(); const manager = await managerFactory();
      await manager.trust(networkKey(network));
    },
    readCertificate: adapters?.readCertificate || (() => readFile(path.join(root, 'PanoKopru-Local-CA.cer'))),
    activate: async () => {
      checkpoint(); const config = JSON.parse(await readFile(file, 'utf8')); checkpoint();
      if (!config.setupPending) throw new Error('Setup identity no longer pending.');
      await save({ ...config, enabled: true, setupPending: false });
      try {
        checkpoint(); active = await factory(); checkpoint();
        if (active.status().state !== 'ready') throw new Error('Local TLS listener could not start.');
      } catch (error) {
        await active.close(); await save({ ...config, enabled: false, setupPending: true });
        if (!closed) active = await factory(); throw error;
      }
    }
  });
  const track = (name, action) => (...args) => {
    checkpoint();
    if (operation) throw Object.assign(new Error('Başka bir ağ işlemi sürüyor.'), { statusCode: 409 });
    operation = name;
    const task = Promise.resolve().then(() => { checkpoint(); return action(...args); });
    pending.add(task);
    void task.then(() => { pending.delete(task); operation = null; }, () => { pending.delete(task); operation = null; });
    return task;
  };
  const invoke = method => track(method, (...args) => {
    if (setup.status().busy || setup.status().available) throw Object.assign(new Error('Önce ilk kurulum adımlarını tamamla.'), { statusCode: 409 });
    if (!active[method]) throw Object.assign(new Error('Yerel ağ henüz hazırlanmadı.'), { statusCode: 409 });
    return active[method](...args);
  });
  return {
    setup: { ...setup, begin: track('setup', setup.begin), confirm: track('setup', setup.confirm), cancel: track('setup', setup.cancel) },
    status: () => ({ ...active.status(), canCleanupPermissions: !closed, networkOperation: operation ? { action: operation } : active.status().networkOperation }),
    handleSetup: (...args) => closed ? false : active.handleSetup(...args),
    inspectNetworks: invoke('inspectNetworks'), trustNetwork: invoke('trustNetwork'),
    removeNetwork: invoke('removeNetwork'),
    cleanupPermissions: track('cleanup', async () => {
      // This remains available even before activation. Never overlap setup/UAC.
      if (active.status().configured) return active.cleanupPermissions();
      await setup.cancel();
      try { await readFile(file, 'utf8'); }
      catch (error) { if (error.code === 'ENOENT') return { ok: true, message: 'Henüz verilmiş PanoKöprü ağ izni yok.' }; throw error; }
      const manager = await managerFactory();
      return manager.cleanupPermissions();
    }),
    close() {
      closed = true;
      return closing ||= (async () => { await setup.close(); await Promise.allSettled([...pending]); await active.close(); })();
    }
  };
}
