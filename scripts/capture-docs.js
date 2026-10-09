// Documentation-only English labels on the real desktop UI with synthetic adapters.
// This does not add English support to the installed app or access personal state.
import { chromium } from '@playwright/test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createHistory } from '../src/history.js';
import { createDesktopServer } from '../src/desktop-server.js';
import { createTestSystem } from '../test/support/desktop-system.js';

const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-doc-preview-'));
let browser, server;
const output = path.resolve('build/docs-preview');
const labels = {
  'CİHAZLARIN ARASINDA.': 'BETWEEN YOUR DEVICES.', 'ÇALIŞMA ALANI': 'WORKSPACE',
  'Çalışma alanı': 'Workspace', 'Aktarım geçmişi': 'Transfer history', 'Favoriler': 'Favorites',
  'Bağlantı': 'Connection', 'Ayarlar': 'Settings', 'Köprü hazır': 'Bridge ready',
  'Sana özel bir köprü': 'Your personal bridge', 'Geçmişin bu bilgisayarda.': 'History stays on this PC.',
  'Üçüncü taraf bulut depolaması yok.': 'No third-party cloud storage.',
  'KOPYALA. GEÇİŞ YAP. DEVAM ET.': 'COPY. SWITCH. KEEP GOING.',
  'Her şey, bir pano uzağında.': 'One clipboard. Two devices.',
  'Metinlerin, fotoğrafların ve dosyaların için ortak bir alan.': 'A shared space for your text, photos and files.',
  'Panoyu kaydet': 'Save clipboard', 'KİŞİSEL KÖPRÜN': 'YOUR PERSONAL BRIDGE',
  'İki cihaz. Kesintisiz fikirler.': 'Two devices. Keep your ideas moving.',
  'Bağlantıyı yönet': 'Manage connection', 'Bu bilgisayar': 'This PC',
  'Kestirme ile aktar': 'Transfer with a Shortcut', 'Yerel HTTPS': 'Local HTTPS',
  'Son aktarımlar': 'Recent transfers', 'Tümü': 'All', 'Metinler': 'Text',
  'Görseller': 'Images', 'Dosyalar': 'Files', 'Tüm yönler': 'All directions',
  'METİN': 'TEXT', 'GÖRSEL': 'IMAGE', 'DOSYA': 'FILE', 'Kopyala': 'Copy',
  'Yalnızca aktarımlar ve elle kaydettiğin öğeler tutulur.': 'Only transfers and items you save are recorded.',
  'AYNI AĞDA · BİRİNCİ YOL': 'SAME NETWORK · LOCAL ROUTE',
  'Yakında, Tailscale’siz.': 'Nearby, without Tailscale.', 'HTTPS · HAZIR': 'HTTPS · READY',
  'Güvenilen ağlar': 'Trusted networks', 'Bağlı ağları yenile': 'Refresh networks',
  'Ağını seç, erişimi sen yönet. Wi-Fi, Ethernet ve USB bağlantıları.': 'Choose your network. Control access over Wi-Fi, Ethernet or USB.',
  'Şu anda bağlı': 'Currently connected', 'Güvenilen liste': 'Trusted list',
  'İzni onar': 'Repair permission', 'Listeden çıkar': 'Remove',
  'PanoKöprü Windows izinlerini temizle': 'Clean up PanoKopru Windows permissions',
  'Ağ adı tek başına kimlik doğrulaması değildir. Uygulama kayıtlı ağ/bağdaştırıcı eşleşmesini, HTTPS sertifikasını ve erişim anahtarını kullanır. Yalnızca kontrol ettiğin ev veya kişisel paylaşım ağlarını ekle; ortak/okul ağlarına güven verme.': 'Network names alone do not authenticate a connection. PanoKopru checks the saved network/adapter, HTTPS certificate and access key. Trust only networks you control.',
  '“Aktif” Windows dinleyicisini gösterir; iPhone erişimini tek başına doğrulamaz. Listeden çıkarma PanoKöprü erişimini kapatır, Windows ağ profilini veya uygulamaya ait dar kapsamlı güvenlik duvarı kurallarını silmez.': 'Active means the Windows listener is ready; it does not verify iPhone access. Removing a network revokes app access; it does not revert its Windows profile or remove firewall rules.',
  'Yerel adresler ve kestirme ayarları': 'Local endpoints and Shortcut settings',
  'Tailscale’siz ilk kurulum': 'First-time setup without Tailscale',
  'Yerel eşleştirme QR kodu': 'Local pairing QR code', 'Eski Tailscale sertifika rehberi': 'Legacy Tailscale certificate guide',
  'Çalışan kurulumda sertifikayı yeniden yükleme. İlk kurulumda yalnız kendi ağını seç ve sertifika parmak izini telefonda karşılaştır. “Hazır” durumu iPhone testi değildir.': 'For first-time setup, select your own network and compare the certificate fingerprint on your phone. Ready does not mean the iPhone test has passed.',
  'Yol seçimi manuel: izinli ağda “Aynı Ağ” kestirmesini, uzaktayken eski Tailscale kestirmesini çalıştır. Otomatik geçiş yok.': 'Choose the route manually: use the local Shortcut on a trusted network or a separate Tailscale Shortcut remotely. No automatic switching.',
  'YEREL İLK KURULUM': 'FIRST-TIME LOCAL SETUP',
  'Önce ağını, sonra sertifikayı doğrula.': 'Choose your network. Verify your certificate.',
  'Bağlı ağ': 'Connected network',
  'Yalnız kendi ev veya kişisel paylaşım ağını seç. Windows bu ağı Özel yapar; diğer uygulamaların mevcut Özel ağ kuralları da etkilenebilir. Okul ve ortak ağları ekleme.': 'Select only your home or personal hotspot network. Windows changes it to Private, which can also affect other apps with existing Private-profile rules. Do not trust public or school networks.',
  'Ağı onayla ve kurulumu başlat': 'Approve network and begin setup',
  'Kurulumu iptal et': 'Cancel setup',
  'Pencereyi kapatmak devam eden Windows onayını iptal etmez. İptal, indirme oturumunu kapatır; verilmiş Windows izinlerini veya telefona yüklenen profili otomatik kaldırmaz.': 'Closing this dialog does not cancel a pending Windows approval. Cancel closes the download session; it does not automatically remove granted permissions or an installed iPhone profile.'
};
async function english(page, overrides = {}) {
  await page.evaluate(({ labels, overrides }) => {
    document.documentElement.lang = 'en';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      const original = node.textContent.trim();
      if (labels[original]) node.textContent = node.textContent.replace(original, labels[original]);
      node.textContent = node.textContent.replaceAll('PanoKöprü', 'PanoKopru');
    }
    for (const [selector, value] of Object.entries(overrides)) document.querySelector(selector).textContent = value;
    document.querySelector('#search').placeholder = 'Search history…';
    document.querySelectorAll('.card-meta span:first-child').forEach((el, i) => el.textContent = `Oct 9, 10:${String(30 - i * 4).padStart(2, '0')}`);
    for (const el of document.querySelectorAll('.connected-network small')) el.textContent = 'Wi-Fi · 192.168.50.2 · Windows: Private';
    for (const el of document.querySelectorAll('.trusted-network small')) el.textContent = el.closest('.active') ? '● Active' : 'Trusted · not in use';
    document.querySelector('#toast').hidden = true;
    document.querySelector('.version span').textContent = '1.1.0';
  }, { labels, overrides });
}
try {
  const history = await createHistory(root);
  const note = await history.record({ type: 'text', content: 'Ideas worth keeping.\nCopy on one device. Continue on the other.', filename: 'Project notes' }, 'inbound');
  await history.favorite(note);
  const photo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#dceae4"/><circle cx="495" cy="95" r="42" fill="#f1c772"/><path d="M0 360L210 105L440 420H0Z" fill="#729b89"/><path d="M170 420L430 165L640 375V420Z" fill="#3c6a58"/></svg>');
  await history.record({ type: 'image', data: await sharp(photo).png().toBuffer(), filename: 'Landscape.png', mimeType: 'image/png' }, 'outbound');
  const document = path.join(root, 'Trip checklist.pdf'); await writeFile(document, '%PDF-1.4\nSynthetic documentation fixture');
  await history.record({ type: 'file', path: document, filename: 'Trip checklist.pdf', mimeType: 'application/pdf' }, 'inbound');
  await history.record({ type: 'text', content: 'Meeting link and next steps\nSaved manually from the demo clipboard.', filename: 'Meeting notes' }, 'local');
  const local = { configured: true, state: 'ready', canCleanupPermissions: true, hostname: 'panokopru-1234abcd.local', port: 32147, activeNetworkName: 'Demo Home',
    connectedNetworks: [{ key: 'a'.repeat(32), name: 'Demo Home', interfaceAlias: 'Wi-Fi', address: '192.168.50.2', category: 'Private', trusted: true }],
    allowedNetworks: [{ key: 'a'.repeat(32), name: 'Demo Home', connection: 'Wi-Fi', active: true }] };
  server = await createDesktopServer({ system: createTestSystem({ network: async () => ({ connected: false }) }),
    config: { configPath: path.join(root, 'config.json'), token: 'synthetic-docs-only' }, history,
    transfers: { getItem: async () => ({ type: 'text', content: 'Synthetic documentation fixture' }) },
    localNetwork: { status: () => local, setup: { status: () => ({ available: true, phase: 'not_started', busy: false }),
      networks: async () => [{ key: 'a'.repeat(32), name: 'Demo Home', interfaceAlias: 'Wi-Fi', category: 'Private' }] } } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const token = await readFile(path.join(root, 'desktop-token'), 'utf8');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1, locale: 'en-US' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(navigator.clipboard, 'writeText', { value: async () => { throw new Error('Clipboard unavailable in documentation preview'); } }));
  await page.goto(`http://127.0.0.1:${server.address().port}/#token=${token}`);
  await page.locator('.card').nth(3).waitFor();
  await page.locator('.card-preview img').waitFor();
  await mkdir(output, { recursive: true });
  const base = { '#network-description': 'Demo Home · Local HTTPS. Run a Shortcut to transfer.', '#item-count': '4 items', '#retention': 'Last 100 items' };
  await english(page, base);
  await page.screenshot({ path: path.join(output, 'history-dark.png'), animations: 'disabled', fullPage: true });
  await page.locator('#theme-toggle').click();
  await english(page, base);
  await page.screenshot({ path: path.join(output, 'history-light.png'), animations: 'disabled', fullPage: true });
  await page.locator('[data-view="connection"]').click();
  await english(page, { '#breadcrumb': 'Connection', '#connection-page > .eyebrow': 'TWO ROUTES. ONE CLIPBOARD.', '#connection-page > h1': 'Your connection, at a glance.', '#connection-page > p': 'Local HTTPS at home. Tailscale remotely. You choose the Shortcut.', '#local-status': 'Local HTTPS is ready on Demo Home. Use your local send and receive Shortcuts.' });
  // Capture the actual local-network panel; remote/pairing dialogs remain unopened.
  await page.locator('.local-panel').screenshot({ path: path.join(output, 'trusted-networks.png'), animations: 'disabled' });
  await page.locator('#setup-wizard').click();
  await page.locator('#setup-dialog[open]').waitFor();
  await english(page, { '#setup-status': 'Choose a network you control. Windows will ask for permission.', '#setup-network option': 'Demo Home · Wi-Fi · Private' });
  await page.locator('#setup-dialog').screenshot({ path: path.join(output, 'first-time-setup.png'), animations: 'disabled' });
  assert.deepEqual(errors, []);
  assert.equal(await page.locator('#qr').getAttribute('src'), null);
  console.log('Documentation capture PASS: four synthetic English previews; no OS/clipboard/network-permission actions or pairing QR.');
} finally {
  await browser?.close();
  if (server?.listening) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(root, { recursive: true, force: true });
}
