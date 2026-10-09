import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, X509Certificate } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import multicastDNS from 'multicast-dns';
import { isIPv4 } from 'node:net';
import { createServer } from './app.js';
import { translate } from './i18n.js';
import { approvedNetworks, matchesApprovedNetwork, networkKey, canTrust } from './network-policy.js';
import { createNetworkManager } from './network-manager.js';
import { assertProductionReady } from '../scripts/source-guard.js';
export { approvedNetworks, matchesApprovedNetwork } from './network-policy.js';

const run = promisify(execFile);
const scriptRoot = fileURLToPath(new URL('../scripts/', import.meta.url));
async function powershell(script, args = []) {
  assertProductionReady();
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(scriptRoot, script), ...args], { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
  return JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
}
export const getLocalNetworks = () => powershell('local-network-info.ps1');
export function isPrivateIPv4(address) {
  if (typeof address !== 'string' || !isIPv4(address)) return false;
  const a = address?.split('.').map(Number);
  return a?.length === 4 && a.every(x => Number.isInteger(x) && x >= 0 && x <= 255) && (a[0] === 10 || (a[0] === 172 && a[1] >= 16 && a[1] <= 31) || (a[0] === 192 && a[1] === 168));
}
export function sameSubnet(remote, address, prefix) {
  if (!isPrivateIPv4(remote) || !isPrivateIPv4(address) || !Number.isInteger(prefix) || prefix < 8 || prefix > 30) return false;
  const number = ip => ip.split('.').reduce((value, octet) => ((value << 8) | Number(octet)) >>> 0, 0);
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (number(remote) & mask) === (number(address) & mask);
}
export function trustedHome(config, networks, permission) {
  for (const approved of approvedNetworks(config)) {
    const found = networks.find(net => matchesApprovedNetwork(approved, net) && net.category === 'Private' && isPrivateIPv4(net.address) && hasNetworkPermission(config, net, permission));
    if (found) return found;
  }
}
export function hasNetworkPermission(config, net, permission) {
  if (approvedNetworks(config).some(entry => entry.permissionGranted === true && matchesApprovedNetwork(entry, net))) return true;
  if (config.permissionsRevoked) return false;
  if (permission?.ok !== true) return false;
  if (Array.isArray(permission.approvedNetworks)) {
    return permission.approvedNetworks.some(approved => matchesApprovedNetwork(approved, net));
  }
  // Legacy permission applies only to the original home, never to added networks.
  return Array.isArray(permission.approvedProfileIds)
    ? approvedNetworks(config).filter(approved => approved.id.toLowerCase() === net.id.toLowerCase()).length === 1
      && permission.approvedProfileIds.some(id => id.toLowerCase() === net.id.toLowerCase())
    : !!config.home && matchesApprovedNetwork(config.home, net);
}
export async function prepareLocalNetwork(stateRoot, approvedProfileId, { port = 32147 } = {}) {
  const root = path.join(stateRoot, 'lan');
  const networks = await getLocalNetworks();
  const home = networks.find(net => net.id.toLowerCase() === approvedProfileId.toLowerCase() && isPrivateIPv4(net.address));
  if (!home) throw new Error('Onaylanan ev ağı bulunamadı.');
  await mkdir(root, { recursive: true });
  await powershell('protect-local-state.ps1', ['-DataRoot', stateRoot]);
  let config;
  try { config = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (config && !config.setupPending) throw new Error('Mevcut kurulum ilk kurulum işlemiyle değiştirilemez.');
  if (!config) {
    config = { enabled: false, setupPending: true, trustedNetworks: [], hostname: `panokopru-${randomBytes(4).toString('hex')}.local`, port, home: { id: home.id, name: home.name, interfaceAlias: home.interfaceAlias, previousCategory: home.category }, createdAt: new Date().toISOString() };
    await writeFile(path.join(root, 'config.json'), JSON.stringify(config, null, 2), { flag: 'wx' });
  }
  await powershell('local-certificates.ps1', ['-Mode', 'Ensure', '-Address', home.address, '-DataRoot', stateRoot]);
  return { hostname: config.hostname, address: home.address, port: config.port, category: home.category };
}
export async function loadLocalTLS(root, address) {
  await powershell('local-certificates.ps1', ['-Mode', 'Ensure', '-Address', address, '-DataRoot', path.dirname(root)]);
  const { passphrase } = await powershell('local-certificates.ps1', ['-Mode', 'Load', '-Address', address, '-DataRoot', path.dirname(root)]);
  return { pfx: await readFile(path.join(root, 'server.pfx')), passphrase, minVersion: 'TLSv1.2', handshakeTimeout: 10000 };
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]);
export async function createLocalNetwork({ stateRoot, apiOptions, port = 32147, networkReader = getLocalNetworks }) {
  const root = path.join(stateRoot, 'lan');
  let config;
  try { config = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; return { status: () => ({ configured: false, state: 'not_configured' }), handleSetup: async () => false, close() {} }; }
  if (!/^panokopru-[a-f0-9]{8}\.local$/.test(config.hostname) || config.port !== port) throw new Error('Geçersiz yerel ağ ayarı.');
  if (config.setupPending) return { status: () => ({ configured: false, setupPending: true, state: 'setup_pending' }), handleSetup: async () => false, close() {} };
  const certificate = new X509Certificate(await readFile(path.join(root, 'PanoKopru-Local-CA.cer')));
  let status = { configured: true, state: 'checking', hostname: config.hostname, port: config.port, homeName: config.home?.name, fingerprint: certificate.fingerprint256, fingerprintSHA1: certificate.fingerprint };
  let server, mdns, boundNetwork, lastCheck = 0, refreshing = false, closed = false, lastRenewal = 0, refreshTask, closing;
  const drains = new Set();
  let currentNetworks = [];
  const manager = await createNetworkManager({ root, networkReader, onChange: () => {
    config = manager.config(); closeListener(); status = { ...status, state: 'checking', address: null, activeNetworkName: null };
    void refresh();
  } });
  function closeListener() {
    boundNetwork = null;
    if (mdns) { mdns.destroy(); mdns = null; }
    if (server) {
      const task = server.closeAndDrain(); drains.add(task);
      void task.then(() => drains.delete(task)); server = null;
    }
  }
  const publicStatus = () => ({ ...status,
    canCleanupPermissions: true,
    networkOperation: manager.operation(),
    connectedNetworks: currentNetworks.filter(canTrust).map(net => ({ key: networkKey(net), name: net.name, interfaceAlias: net.interfaceAlias, address: net.address, category: net.category, trusted: approvedNetworks(config).some(entry => matchesApprovedNetwork(entry, net)) })),
    allowedNetworks: approvedNetworks(config).map(entry => ({
      key: networkKey(entry), interfaceAlias: entry.interfaceAlias,
      name: entry.name,
      connection: entry.interfaceDescription === 'Apple Mobile Device Ethernet' ? 'USB ağı' : entry.interfaceAlias,
      active: status.state === 'ready' && !!boundNetwork && matchesApprovedNetwork(entry, boundNetwork)
    })),
    endpoint: status.address ? `https://${config.hostname}:${config.port}/api/v1/clipboard` : null,
    ipEndpoint: status.address ? `https://${status.address}:${config.port}/api/v1/clipboard` : null });
  function refresh() {
    if (closed) return Promise.resolve();
    if (refreshing) return refreshTask;
    return refreshTask = refreshNow();
  }
  async function refreshNow() {
    if (refreshing || closed) return;
    refreshing = true;
    try {
      const networks = await networkReader();
      if (closed) return;
      currentNetworks = networks;
      config = manager.config();
      const revision = config;
      lastCheck = Date.now();
      let permission;
      try { permission = JSON.parse(await readFile(path.join(root, 'firewall-result.json'), 'utf8')); } catch {}
      const home = trustedHome(config, networks, permission);
      if (!config.enabled || !home || !hasNetworkPermission(config, home, permission)) {
        closeListener();
        status = { ...status, address: null, activeNetworkName: null, state: !config.enabled ? 'disabled' : networks.some(net => approvedNetworks(config).some(approved => matchesApprovedNetwork(approved, net))) ? 'needs_permission' : 'away' };
        return;
      }
      if (boundNetwork?.address === home.address && boundNetwork.id === home.id && boundNetwork.prefixLength === home.prefixLength && Date.now() - lastRenewal < 24 * 60 * 60 * 1000) return;
      closeListener();
      const tls = await loadLocalTLS(root, home.address);
      if (closed || revision !== manager.config()) return;
      boundNetwork = home;
      server = createServer({ ...apiOptions, tls, transportGuard: req => !!boundNetwork && manager.config().enabled && approvedNetworks(manager.config()).some(entry => matchesApprovedNetwork(entry, boundNetwork)) && Date.now() - lastCheck < 30000 && sameSubnet(req.socket.remoteAddress, boundNetwork.address, boundNetwork.prefixLength) });
      server.requestTimeout = 30 * 60 * 1000;
      server.on('error', () => { status.state = 'error'; });
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, home.address, resolve); });
      if (closed || revision !== manager.config()) { closeListener(); return; }
      lastRenewal = Date.now();
      status = { ...status, address: home.address, activeNetworkName: home.name, state: 'ready', discovery: true };
      mdns = multicastDNS({ interface: home.address, bind: '0.0.0.0', multicast: true, reuseAddr: true });
      mdns.on('error', () => { status.discovery = false; });
      mdns.on('warning', () => { status.discovery = false; });
      mdns.on('query', (packet, source) => {
        if (!boundNetwork || !approvedNetworks(manager.config()).some(entry => matchesApprovedNetwork(entry, boundNetwork)) || !sameSubnet(source.address, boundNetwork.address, boundNetwork.prefixLength)) return;
        if (packet.questions.some(q => q.name.toLowerCase() === config.hostname && ['A', 'ANY'].includes(q.type))) {
          mdns.respond({ answers: [{ name: config.hostname, type: 'A', ttl: 30, flush: true, data: boundNetwork.address }] });
        }
      });
    } catch { closeListener(); status = { ...status, state: 'error', address: null }; }
    finally { refreshing = false; }
  }
  const timer = setInterval(refresh, 10000); timer.unref();
  await refresh();
  return {
    status: publicStatus,
    refresh,
    inspectNetworks: () => manager.inspect(),
    trustNetwork: key => manager.trust(key),
    removeNetwork: key => manager.remove(key),
    cleanupPermissions: () => manager.cleanupPermissions(),
    close() {
      closed = true; clearInterval(timer); closeListener();
      return closing ||= (async () => { await refreshTask; closeListener(); await Promise.all([...drains]); })();
    },
    async handleSetup(req, res) {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (req.method !== 'GET' || !['/local-setup', '/local-ca.cer'].includes(pathname)) return false;
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
      if (pathname === '/local-ca.cer') {
        res.setHeader('Content-Type', 'application/x-x509-ca-cert'); res.setHeader('Content-Disposition', 'attachment; filename="PanoKopru-Local-CA.cer"');
        res.end(certificate.raw); return true;
      }
      const origin = `https://${config.hostname}:${config.port}`;
      const language = apiOptions.getLanguage?.() || 'tr';
      const t = (key, values) => translate(key, language, values);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
      res.end(`<!doctype html><html lang="${language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t('m_62d461d98956')}</title><style>body{font:16px system-ui;background:#f4f6f3;color:#203329;max-width:640px;margin:auto;padding:28px 20px;line-height:1.6}section{background:white;border:1px solid #c7dcca;border-radius:14px;padding:20px;margin:20px 0}a{color:#235e3d}code{word-break:break-all;font-size:13px}small{overflow-wrap:anywhere}h1{line-height:1.2}strong{color:#285e43}</style><h1>${t('m_d0e4569cc2cc')}</h1><p>${t('m_5a7a89e1360d')}</p><section><h2>${t('m_a94a80959c8e')}</h2><p><a href="/local-ca.cer">${t('m_39394f5cbe32')}</a></p><p>${t('m_74e5d6e46533')}</p><p>${t('m_e2c5d7c0ec6c')} <strong>PanoKopru Local CA</strong> ${t('m_0599bf8a5cb3')}</p><p>${t('m_a711ee2c1473')}</p><small>SHA-256: ${escape(certificate.fingerprint256)}<br>SHA-1: ${escape(certificate.fingerprint)}</small></section><section><h2>${t('m_c5fd69192b59')}</h2><p>${t('m_ec288fbd0f71')} <a href="${origin}/health">${t('m_ad1603e555ea')}</a>${t('m_3b6f0307af5b')} <code>ok: true</code> ${t('m_4d94860771b0')}</p><p>${t('m_6e731464010c', { state: escape(publicStatus().state) })}</p></section><section><h2>${t('m_6fc61bcd1b92')}</h2><p>${t('m_fcdaf41c7745')}</p><p>${t('m_bc880984dca6')}</p><code>${origin}/api/v1/clipboard</code><p>${t('m_a0d702b482d2')}</p><code>${origin}/api/v1/clipboard/kind</code><p>${t('m_b317aa5cc57f')}</p><p>${t('m_b03dfde73b9d')}</p></section><p>${t('m_6b0ebb41b4c1')}</p></html>`);
      return true;
    }
  };
}
