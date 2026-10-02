import { createServer } from "./app.js";
import { loadConfig } from "./config.js";
import { createTransferHandlers } from "./transfer.js";
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createHistory } from './history.js';
import { createDesktopServer } from './desktop-server.js';
import { createLocalNetwork } from './local-network.js';

const config = await loadConfig();
const history = await createHistory(path.dirname(config.configPath));
const transfers = createTransferHandlers(config, { onReceived: item => history.record(item, 'inbound') });
const diagnosticsPath = path.join(path.dirname(config.configPath), "transfer-diagnostics.json");
let recentEvents = [];
try {
  const saved = JSON.parse(await readFile(diagnosticsPath, "utf8"));
  if (Array.isArray(saved)) recentEvents = saved.slice(-60);
} catch { /* First start or unavailable diagnostics. */ }
let pendingDiagnostics = Promise.resolve();
function recordTransfer(event) {
  recentEvents.push(event);
  recentEvents = recentEvents.slice(-60);
  const serialized = JSON.stringify(recentEvents, null, 2);
  pendingDiagnostics = pendingDiagnostics.then(() => writeFile(diagnosticsPath, serialized, "utf8")).catch(() => {});
}
const apiOptions = {
  token: config.token,
  setClipboardItem: transfers.setItem,
  getClipboardItem: transfers.getItem,
  onClipboardSent: item => history.record(item, 'outbound'),
  onTransferEvent: recordTransfer
};
const localNetwork = await createLocalNetwork({ stateRoot: path.dirname(config.configPath), apiOptions: { ...apiOptions, onTransferEvent: event => recordTransfer({ ...event, transport: 'local' }) } }).catch(() => ({ status: () => ({ configured: true, state: 'error' }), handleSetup: async () => false, close() {} }));
const server = createServer({ ...apiOptions, handleExtraRequest: localNetwork.handleSetup });
const desktop = await createDesktopServer({ config, history, transfers, diagnostics: () => recentEvents, localNetwork });
desktop.on('error', error => console.error('Masaustu arayuzu baslatilamadi:', error.code));
desktop.listen(32146, '127.0.0.1');

// Allow large uploads over slower Tailscale connections up to 30 minutes.
server.requestTimeout = 30 * 60 * 1000;

server.listen(config.port, config.host, () => {
  console.log("iPhone -> Windows Pano Koprusu calisiyor.");
  console.log(`Yerel adres: http://${config.host}:${config.port}`);
  console.log("Anahtari ve kurulum bilgisini gormek icin: npm.cmd run info");
});

function shutDown(signal) {
  localNetwork.close();
  desktop.close();
  console.log(`\n${signal} alindi, kopru kapatiliyor...`);
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
