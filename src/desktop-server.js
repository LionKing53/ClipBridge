import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { disposeTransfer } from './owned-outbox.js';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import QRCode from 'qrcode';
import { setWindowsClipboard } from './clipboard.js';
import { setWindowsClipboardFiles, setWindowsClipboardImageAndFile } from './clipboard-media.js';
import { assertProductionReady } from '../scripts/source-guard.js';
import { publicFailure, operationError } from './errors.js';
import { manageRequests } from './managed-http.js';
import { createPreferences, messages, errorMessages, translate, translateMessage } from './i18n.js';

const run = promisify(execFile);
const publicRoot = fileURLToPath(new URL('../desktop/', import.meta.url));
const tailscale = 'C:\\Program Files\\Tailscale\\tailscale.exe';
const defaultSystem = {
  hostname: () => os.hostname(),
  network: async () => {
    const { stdout } = await run(tailscale, ['status', '--json'], { windowsHide: true, timeout: 5000, maxBuffer: 4 * 1024 ** 2 });
    const data = JSON.parse(stdout);
    return { connected: data.BackendState === 'Running', dnsName: data.Self?.DNSName?.replace(/\.$/, ''), ip: data.TailscaleIPs?.[0] || data.Self?.TailscaleIPs?.[0] };
  },
  copyText: setWindowsClipboard,
  copyFiles: setWindowsClipboardFiles,
  copyImageAndFile: setWindowsClipboardImageAndFile,
  reveal: source => run('explorer.exe', ['/select,', source], { windowsHide: true }).catch(() => {})
};
const writeJson = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
export async function createDesktopServer({ config, history, transfers, diagnostics = () => [], localNetwork, storage, system = defaultSystem }) {
  if (system === defaultSystem) assertProductionReady();
  // Explicitly supplied adapters must be complete; never fall back to real OS actions.
  for (const key of Object.keys(defaultSystem)) {
    if (typeof system[key] !== 'function') throw new Error('Incomplete desktop system adapter: ' + key);
  }
  const token = randomBytes(32).toString('hex');
  const preferences = config.preferences || await createPreferences(path.dirname(config.configPath));
  config.preferences = preferences;
  const json = (res, status, value) => {
    const language = preferences.get().language;
    if (value.message) value = { ...value, message: translateMessage(value.message, language) };
    if (value.error && !value.message) {
      const message = translateMessage(value.error, language);
      value = { ...value, message: message !== value.error ? message : publicFailure({ statusCode: status }, undefined, language).body.message };
    }
    writeJson(res, status, value);
  };
  await writeFile(path.join(path.dirname(config.configPath), 'desktop-token'), token, 'utf8');
  let networkCache, networkAt = 0;
  async function network() {
    if (networkCache && Date.now() - networkAt < 10000) return networkCache;
    try {
      networkCache = await system.network();
    } catch { networkCache = { connected: false }; }
    networkAt = Date.now(); return networkCache;
  }
  async function body(req) {
    let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 4096) throw Object.assign(new Error('İstek çok büyük.'), { statusCode: 413 }); }
    try { return JSON.parse(text || '{}'); } catch { throw Object.assign(new Error('Geçersiz istek.'), { statusCode: 400 }); }
  }
  return manageRequests(http.createServer(), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'");
    const localOrigin = `http://127.0.0.1:${res.socket.localPort}`;
    if (req.headers.host !== `127.0.0.1:${res.socket.localPort}` || (req.headers.origin && req.headers.origin !== localOrigin)) return json(res, 403, { error: 'Erişim reddedildi.' });
    try {
      const url = new URL(req.url, localOrigin);
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/i18n.js': ['i18n.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/theme.js': ['theme.js', 'text/javascript'], '/theme.css': ['theme.css', 'text/css'], '/setup.css': ['setup.css', 'text/css'] };
      if (req.method === 'GET' && url.pathname === '/translations.json') return json(res, 200, { ...messages, ...errorMessages });
      if (req.method === 'GET' && files[url.pathname]) {
        const [name, type] = files[url.pathname]; res.setHeader('Content-Type', type + '; charset=utf-8'); res.end(await readFile(path.join(publicRoot, name))); return;
      }
      const actual = Buffer.from(req.headers.authorization || ''); const expected = Buffer.from('Bearer ' + token);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return json(res, 401, { error: 'Uygulamayı masaüstü kısayolundan yeniden aç.' });
      if (req.method === 'GET' && url.pathname === '/api/state') {
        return json(res, 200, { ...history.list(), preferences: preferences.get(), storage: storage ? await storage.summary() : null, setup: localNetwork?.setup?.status() || null, machine: system.hostname(), version: '1.2.1', network: await network(), localNetwork: localNetwork?.status() || { configured: false, state: 'not_configured' }, diagnostics: diagnostics().slice(-10), maxFileMB: 512 });
      }
      if (url.pathname === '/api/setup' && req.method === 'GET') {
        if (!localNetwork?.setup) return json(res, 409, { error: 'Kurulum sihirbazı bu ortamda yok.' });
        const setup = localNetwork.setup.status();
        return json(res, 200, { ...setup, networks: await localNetwork.setup.networks(), qr: setup.downloadUrl ? await QRCode.toDataURL(setup.downloadUrl, { width: 320, margin: 2 }) : null });
      }
      if (req.method === 'POST' && ['/api/setup/begin', '/api/setup/confirm', '/api/setup/cancel'].includes(url.pathname)) {
        if (!localNetwork?.setup) return json(res, 409, { error: 'Kurulum sihirbazı bu ortamda yok.' });
        const input = await body(req);
        const action = url.pathname.split('/').pop();
        if (action === 'cancel' && input.confirmed !== true) return json(res, 400, { error: 'İptal onayı gerekiyor.' });
        await localNetwork.setup[action](input);
        return json(res, 200, { ok: true, ...localNetwork.setup.status() });
      }
      if (req.method === 'POST' && ['/api/storage/policy', '/api/storage/cleanup'].includes(url.pathname)) {
        if (!storage) return json(res, 409, { error: 'Depolama yönetimi bu ortamda yok.' });
        const input = await body(req);
        if (url.pathname.endsWith('/policy')) { await storage.policy(input.retentionDays); return json(res, 200, { ok: true }); }
        return json(res, 200, { ok: true, ...await storage.cleanup(input) });
      }
      if (req.method === 'GET' && url.pathname === '/api/local-setup') {
        const local = localNetwork?.status();
        if (!local?.configured) throw operationError('ERR_SETUP_REQUIRED');
        let origin;
        if (local.state === 'ready' && local.endpoint) origin = new URL(local.endpoint).origin;
        else {
          const net = await network();
          if (!net.dnsName || !net.connected) throw operationError('ERR_TAILSCALE_UNAVAILABLE');
          origin = `https://${net.dnsName}`;
        }
        const url = `${origin}/local-setup`;
        return json(res, 200, { ...local, url, qr: await QRCode.toDataURL(url, { width: 320, margin: 2 }) });
      }
      if (req.method === 'POST' && url.pathname === '/api/local-permission') {
        return json(res, 409, { error: 'Güvenilen ağlar bölümünden bağlı ağı seçip İzni onar düğmesini kullan.' });
      }
      if (req.method === 'GET' && url.pathname === '/api/networks') {
        if (!localNetwork?.inspectNetworks) return json(res, 409, { error: 'Yerel ağ kurulumu henüz hazır değil.' });
        return json(res, 200, await localNetwork.inspectNetworks());
      }
      if (req.method === 'POST' && url.pathname === '/api/networks/cleanup') {
        if (!localNetwork?.cleanupPermissions) return json(res, 409, { error: 'İzin temizliği bu ortamda kullanılamıyor.' });
        if ((await body(req)).confirmed !== true) return json(res, 400, { error: 'Windows izin temizliği için açık onay gerekiyor.' });
        return json(res, 200, await localNetwork.cleanupPermissions());
      }
      if (req.method === 'POST' && ['/api/networks/trust', '/api/networks/remove'].includes(url.pathname)) {
        if (!localNetwork?.trustNetwork) return json(res, 409, { error: 'Yerel ağ yönetimi hazır değil.' });
        const value = await body(req);
        if (value.confirmed !== true || typeof value.key !== 'string' || !/^[a-f0-9]{32}$/.test(value.key)) return json(res, 400, { error: 'Ağı seçip onay vermen gerekiyor.' });
        return json(res, 200, await (url.pathname.endsWith('/trust') ? localNetwork.trustNetwork(value.key) : localNetwork.removeNetwork(value.key)));
      }
      if (req.method === 'GET' && url.pathname === '/api/pairing') {
        if (url.searchParams.get('transport') === 'local') {
          const local = localNetwork?.status();
          if (local?.state !== 'ready' || !local.endpoint) return json(res, 409, { error: 'Önce yerel sertifika kurulumunu tamamla ve güvenilen ağa bağlan.' });
          const origin = new URL(local.endpoint).origin;
          return json(res, 200, { endpoint: local.endpoint, qr: await QRCode.toDataURL(`${origin}/setup#token=${encodeURIComponent(config.token)}`, { width: 320, margin: 2 }) });
        }
        const net = await network();
        if (!net.dnsName || !net.connected) throw operationError('ERR_TAILSCALE_UNAVAILABLE');
        const endpoint = `https://${net.dnsName}/api/v1/clipboard`;
        return json(res, 200, { endpoint, qr: await QRCode.toDataURL(`https://${net.dnsName}/setup#token=${encodeURIComponent(config.token)}`, { width: 320, margin: 2 }) });
      }
      if (req.method === 'POST' && url.pathname === '/api/capture') {
        const item = await transfers.getItem();
        try { await history.record(item, 'local'); } finally { await disposeTransfer(item).catch(() => {}); }
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/api/settings') {
        const input = await body(req);
        if (Object.hasOwn(input, 'language')) await preferences.set(input.language);
        if (Object.hasOwn(input, 'enabled') || Object.hasOwn(input, 'limit')) await history.settings(input);
        return json(res, 200, { ok: true });
      }
      if (req.method === 'POST' && url.pathname === '/api/clear') { await history.clear(); return json(res, 200, { ok: true }); }
      const match = /^\/api\/items\/([0-9a-f-]{36})(?:\/(thumbnail|copy|favorite|reveal))?$/.exec(url.pathname);
      if (match) {
        const [, id, action] = match;
        const item = history.detail(id);
        if (req.method === 'GET' && !action) return json(res, 200, { ...item, available: item.type === 'text' ? !item.truncated : !!item.source && !!(await stat(item.source).catch(() => null)) });
        if (req.method === 'GET' && action === 'thumbnail') {
          const thumbnail = history.thumbnail(id); if (!thumbnail) return json(res, 404, { error: 'Önizleme yok.' });
          res.setHeader('Content-Type', 'image/webp'); res.end(await readFile(thumbnail)); return;
        }
        if (req.method === 'DELETE' && !action) { await history.remove(id); return json(res, 200, { ok: true }); }
        if (req.method === 'POST' && action === 'favorite') { await history.favorite(id); return json(res, 200, { ok: true }); }
        if (req.method === 'POST' && ['copy', 'reveal'].includes(action)) {
          if (action === 'copy' && item.type === 'text') {
            if (item.truncated) throw operationError('ERR_PREVIEW_ONLY');
            await system.copyText(item.content);
          } else {
            if (!item.source || !(await stat(item.source).catch(() => null))) throw operationError('ERR_SOURCE_FILE_MISSING');
            if (action === 'reveal') await system.reveal(item.source);
            else if (item.type === 'image' && item.size <= 64 * 1024 ** 2) {
              // Normalize supported formats for the Windows bitmap clipboard; retain original file drop.
              const sharp = (await import('sharp')).default;
              const png = await sharp(item.source, { limitInputPixels: 40_000_000 }).png().toBuffer().catch(() => null);
              if (png) await system.copyImageAndFile(png, item.source); else await system.copyFiles([item.source]);
            } else await system.copyFiles([item.source]);
          }
          return json(res, 200, { ok: true });
        }
      }
      json(res, 404, { error: 'İşlem bulunamadı.' });
    } catch (error) { const failure = publicFailure(error, undefined, preferences.get().language); if (!res.headersSent && !res.destroyed) json(res, failure.status, failure.body); }
  });
}
