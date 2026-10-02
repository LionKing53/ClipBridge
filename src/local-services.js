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
export async function createLocalServices(context, apiOptions) {
  assertRuntimeContext(context); assertProductionReady();
  if (context.mode !== 'production') throw new Error('Live Windows adapters require production.');
  const root = path.join(context.dataRoot, 'lan');
  const file = path.join(root, 'config.json');
  const factory = () => createLocalNetwork({ stateRoot: context.dataRoot, apiOptions, port: context.ports.local });
  let active = await factory();
  const save = async config => { await writeFile(file + '.next', JSON.stringify(config, null, 2)); await rename(file + '.next', file); };
  const setup = await createOnboarding({
    context, networkReader: getLocalNetworks, startBootstrap: startCertificateBootstrap,
    isConfigured: () => active.status().configured === true,
    prepareIdentity: async network => {
      active.close();
      await prepareLocalNetwork(context.dataRoot, network.id, { port: context.ports.local });
    },
    grantPermission: async network => {
      const manager = await createNetworkManager({ root, networkReader: getLocalNetworks });
      await manager.trust(networkKey(network));
    },
    readCertificate: () => readFile(path.join(root, 'PanoKopru-Local-CA.cer')),
    activate: async () => {
      const config = JSON.parse(await readFile(file, 'utf8'));
      if (!config.setupPending) throw new Error('Setup identity no longer pending.');
      await save({ ...config, enabled: true, setupPending: false });
      try {
        active = await factory();
        if (active.status().state !== 'ready') throw new Error('Local TLS listener could not start.');
      } catch (error) {
        active.close(); await save({ ...config, enabled: false, setupPending: true });
        active = await factory(); throw error;
      }
    }
  });
  const invoke = method => (...args) => {
    if (setup.status().busy || setup.status().available) throw Object.assign(new Error('Önce ilk kurulum adımlarını tamamla.'), { statusCode: 409 });
    if (!active[method]) throw Object.assign(new Error('Yerel ağ henüz hazırlanmadı.'), { statusCode: 409 });
    return active[method](...args);
  };
  return {
    setup, status: () => active.status(), handleSetup: (...args) => active.handleSetup(...args),
    inspectNetworks: invoke('inspectNetworks'), trustNetwork: invoke('trustNetwork'),
    removeNetwork: invoke('removeNetwork'), cleanupPermissions: invoke('cleanupPermissions'),
    async close() { await setup.close(); active.close(); }
  };
}
