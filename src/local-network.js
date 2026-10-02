import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, X509Certificate } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import multicastDNS from 'multicast-dns';
import { isIPv4 } from 'node:net';
import { createServer } from './app.js';
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
export function trustedHome(config, networks) {
  for (const approved of approvedNetworks(config)) {
    const found = networks.find(net => matchesApprovedNetwork(approved, net) && net.category === 'Private' && isPrivateIPv4(net.address));
    if (found) return found;
  }
}
export function hasNetworkPermission(config, net, permission) {
  if (approvedNetworks(config).some(entry => entry.permissionGranted === true && matchesApprovedNetwork(entry, net))) return true;
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
export async function prepareLocalNetwork(stateRoot, approvedProfileId) {
  const root = path.join(stateRoot, 'lan');
  const networks = await getLocalNetworks();
  const home = networks.find(net => net.id.toLowerCase() === approvedProfileId.toLowerCase() && isPrivateIPv4(net.address));
  if (!home) throw new Error('Onaylanan ev ağı bulunamadı.');
  await mkdir(root, { recursive: true });
  await powershell('protect-local-state.ps1');
  let config;
  try { config = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (config && config.home.id.toLowerCase() !== approvedProfileId.toLowerCase()) throw new Error('Mevcut güvenilir ağ sessizce değiştirilemez.');
  if (!config) {
    config = { enabled: true, hostname: `panokopru-${randomBytes(4).toString('hex')}.local`, port: 32147, home: { id: home.id, name: home.name, interfaceAlias: home.interfaceAlias, previousCategory: home.category }, createdAt: new Date().toISOString() };
    await writeFile(path.join(root, 'config.json'), JSON.stringify(config, null, 2), { flag: 'wx' });
  }
  await powershell('local-certificates.ps1', ['-Mode', 'Ensure', '-Address', home.address]);
  return { hostname: config.hostname, address: home.address, port: config.port, category: home.category };
}
export async function loadLocalTLS(root, address) {
  await powershell('local-certificates.ps1', ['-Mode', 'Ensure', '-Address', address]);
  const { passphrase } = await powershell('local-certificates.ps1', ['-Mode', 'Load', '-Address', address]);
  return { pfx: await readFile(path.join(root, 'server.pfx')), passphrase, minVersion: 'TLSv1.2', handshakeTimeout: 10000 };
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]);
export async function createLocalNetwork({ stateRoot, apiOptions, networkReader = getLocalNetworks }) {
  const root = path.join(stateRoot, 'lan');
  let config;
  try { config = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8')); } catch { return { status: () => ({ configured: false, state: 'not_configured' }), handleSetup: async () => false, close() {} }; }
  if (!/^panokopru-[a-f0-9]{8}\.local$/.test(config.hostname) || config.port !== 32147) throw new Error('Geçersiz yerel ağ ayarı.');
  const certificate = new X509Certificate(await readFile(path.join(root, 'PanoKopru-Local-CA.cer')));
  let status = { configured: true, state: 'checking', hostname: config.hostname, port: config.port, homeName: config.home?.name, fingerprint: certificate.fingerprint256, fingerprintSHA1: certificate.fingerprint };
  let server, mdns, boundNetwork, lastCheck = 0, refreshing = false, closed = false, lastRenewal = 0;
  let currentNetworks = [];
  const manager = await createNetworkManager({ root, networkReader, onChange: () => {
    config = manager.config(); closeListener(); status = { ...status, state: 'checking', address: null, activeNetworkName: null };
    void refresh();
  } });
  function closeListener() {
    boundNetwork = null;
    if (mdns) { mdns.destroy(); mdns = null; }
    if (server) { server.closeAllConnections(); server.close(); server = null; }
  }
  const publicStatus = () => ({ ...status,
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
  async function refresh() {
    if (refreshing || closed) return;
    refreshing = true;
    try {
      const networks = await networkReader();
      if (closed) return;
      currentNetworks = networks;
      config = manager.config();
      const revision = config;
      lastCheck = Date.now();
      const home = trustedHome(config, networks);
      let permission;
      try { permission = JSON.parse(await readFile(path.join(root, 'firewall-result.json'), 'utf8')); } catch {}
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
    close() { closed = true; clearInterval(timer); closeListener(); },
    async handleSetup(req, res) {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (req.method !== 'GET' || !['/local-setup', '/local-ca.cer'].includes(pathname)) return false;
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
      if (pathname === '/local-ca.cer') {
        res.setHeader('Content-Type', 'application/x-x509-ca-cert'); res.setHeader('Content-Disposition', 'attachment; filename="PanoKopru-Local-CA.cer"');
        res.end(certificate.raw); return true;
      }
      const origin = `https://${config.hostname}:${config.port}`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
      res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PanoKöprü · Ev ağı kurulumu</title><style>body{font:16px system-ui;background:#f4f6f3;color:#203329;max-width:640px;margin:auto;padding:28px 20px;line-height:1.6}section{background:white;border:1px solid #c7dcca;border-radius:14px;padding:20px;margin:20px 0}a{color:#235e3d}code{word-break:break-all;font-size:13px}small{overflow-wrap:anywhere}h1{line-height:1.2}strong{color:#285e43}</style><h1>PanoKöprü · Yerel bağlantı</h1><p>Bu sayfayı ilk kurulum için mevcut Tailscale bağlantısı üzerinden açıyorsun. Kurulumdan sonra ev ağında Tailscale gerekmeyecek.</p><section><h2>1 · Sertifikayı yükle</h2><p><a href="/local-ca.cer">PanoKöprü yerel sertifikasını indir</a></p><p>iPhone Ayarlar → Genel → VPN ve Aygıt Yönetimi bölümünden indirilen sertifika profilini yükle.</p><p>Ardından Genel → Hakkında → Sertifika Güven Ayarları bölümünde <strong>PanoKopru Local CA</strong> için güveni aç.</p><p>Bu bir cihaz yönetimi (MDM) kaydı değildir. Yine de kök sertifika güveni hassas bir ayardır: yalnızca kendi bilgisayarındaki kurulum ekranıyla eşleşen sertifikaya güven.</p><small>SHA-256: ${escape(certificate.fingerprint256)}<br>SHA-1: ${escape(certificate.fingerprint)}</small></section><section><h2>2 · Yerel bağlantıyı dene</h2><p>Telefon ve bilgisayar ev ağına bağlıyken Tailscale’ı telefonda kapat. Sonra <a href="${origin}/health">yerel bağlantı testini aç</a>. Başarılıysa <code>ok: true</code> görürsün.</p><p>Bilgisayar tarafı: ${escape(publicStatus().state)}. Windows izin onayı tamamlanmış olmalı.</p></section><section><h2>3 · Kestirmelerin yerel kopyaları</h2><p>Çalışan iki kestirmeyi silme. Kopyalarını oluşturup adlarının sonuna “Ev” ekle. Bu kopyalardaki Tailscale bağlan/ayrıl adımlarını ve bağlantı beklemesini kaldır.</p><p>Gönderme/alma API adresi:</p><code>${origin}/api/v1/clipboard</code><p>Pano türü adresi:</p><code>${origin}/api/v1/clipboard/kind</code><p>Authorization başlığını, GET/POST yöntemlerini, gönderilen içeriği ve metin/görsel/dosya dallarını değiştirme.</p><p>Eski kestirmeler uzaktan kullanım ve yedek yol olarak kalır. Otomatik yol seçimi bu kurulumun ardından ayrıca test edilecek.</p></section><p>Yerel adres çalışmıyorsa sertifika uyarısını atlama; mevcut Tailscale kestirmesini kullan.</p></html>`);
      return true;
    }
  };
}
