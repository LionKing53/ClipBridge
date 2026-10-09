import { createServer } from './app.js';
import { loadConfig } from './config.js';
import { createHistory } from './history.js';
import { createTransferHandlers } from './transfer.js';
import { createDesktopServer } from './desktop-server.js';
import { createLocalServices } from './local-services.js';
import { acquireInstance } from './runtime-context.js';
import { assertProductionReady } from '../scripts/source-guard.js';
import { createDiagnostics } from './diagnostics.js';
import { createStorage, cleanStaging } from './storage.js';
import path from 'node:path';
import { cleanOwnedOutbox } from './owned-outbox.js';

export async function startBridge(context, adapters = {}) {
  const isolated = context.mode !== 'production';
  if (!isolated) assertProductionReady();
  if (isolated && (!adapters.transfers || !adapters.system || !adapters.localNetwork)) throw new Error('Isolated runtime requires all explicit OS adapters.');
  const release = await acquireInstance(context);
  const servers = []; let localNetwork, diagnostics;
  let closing;
  const close = () => closing ||= (async () => {
    // Begin all admission stops synchronously; never release the instance while
    // a disconnected HTTP request is still writing clipboard/history/config.
    await Promise.all([localNetwork?.close(), ...servers.map(server => server.closeAndDrain())]);
    await diagnostics?.flush();
    await release();
  })();
  try {
    const config = await loadConfig(context);
    const history = await createHistory(context.dataRoot);
    const storage = await createStorage(context.dataRoot, history);
    const stagingRoot = path.join(context.dataRoot, 'temp');
    await cleanStaging(stagingRoot, context.instanceId);
    await cleanOwnedOutbox(context);
    diagnostics = await createDiagnostics(context.dataRoot);
    const transfers = adapters.transfers || createTransferHandlers(config, { storage, onReceived: item => history.record(item, 'inbound') });
    const apiOptions = { token: config.token, getLanguage: () => config.preferences.get().language, instanceId: context.instanceId, uploadOptions: { stagingRoot, instanceId: context.instanceId }, setClipboardItem: transfers.setItem, getClipboardItem: transfers.getItem,
      onClipboardSent: item => history.record(item, 'outbound'), onTransferEvent: event => diagnostics.record(event), logger: adapters.logger || console };
    localNetwork = adapters.localNetwork || await createLocalServices(context, { ...apiOptions, onTransferEvent: event => diagnostics.record({ ...event, transport: 'local' }) });
    const api = createServer({ ...apiOptions, handleExtraRequest: localNetwork.handleSetup });
    servers.push(api);
    api.requestTimeout = 30 * 60 * 1000;
    const desktop = await createDesktopServer({ config, history, transfers, storage, localNetwork, diagnostics: diagnostics.list, ...(adapters.system ? { system: adapters.system } : {}) });
    servers.push(desktop);
    for (const [server, port] of [[api, context.ports.api], [desktop, context.ports.desktop]]) {
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    }
    return { config, api, desktop, close };
  } catch (error) { await close(); throw error; }
}
