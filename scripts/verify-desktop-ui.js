// Isolated UI acceptance test. Never reads or changes the user's Windows clipboard.
import { chromium } from '@playwright/test';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHistory } from '../src/history.js';
import { createDesktopServer } from '../src/desktop-server.js';
import { createTestSystem, fixtureMachine } from '../test/support/desktop-system.js';
import sharp from 'sharp';
import { createStorage } from '../src/storage.js';
import { operationError } from '../src/errors.js';

const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-ui-test-'));
const history = await createHistory(root);
const storage = await createStorage(root, history);
let setupState = { available: false, phase: 'not_started', busy: false };
let localState = { configured: true, state: 'ready', hostname: 'panokopru-1234abcd.local', port: 32147, activeNetworkName: 'Demo Hotspot', allowedNetworks: [
  { key: 'a'.repeat(32), name: 'Ev ağı', connection: 'Ev ağı', active: false },
  { key: 'b'.repeat(32), name: 'Demo USB', connection: 'iPhone · USB paylaşımı', active: false },
  { key: 'c'.repeat(32), name: 'Demo Hotspot', connection: 'iPhone · Wi-Fi paylaşımı', active: true }
], connectedNetworks: [{ key: 'c'.repeat(32), name: 'Demo Hotspot', interfaceAlias: 'WLAN', address: '10.20.30.2', category: 'Private', trusted: true }, { key: 'd'.repeat(32), name: 'Yeni Ev <img src=x onerror=alert(1)>', interfaceAlias: 'Ethernet', address: '192.168.5.2', category: 'Public', trusted: false }] };
let denyTrust = true;
const server = await createDesktopServer({ system: createTestSystem(), config: { configPath: path.join(root, 'config.json'), token: 'isolated-test-token' }, history, storage, transfers: { getItem: async () => ({ type: 'text', content: 'Panodan eklenen test metni' }) }, localNetwork: {
  setup: {
    status: () => setupState,
    networks: async () => [{ key: 'a'.repeat(32), name: 'Demo Setup <script>bad()</script>', interfaceAlias: 'WLAN', category: 'Private' }],
    begin: async ({ confirmed }) => { assert.equal(confirmed, true); setupState = { available: true, phase: 'certificate', fingerprint: 'AB:'.repeat(31) + 'AB', downloadUrl: 'http://192.168.50.2:32147/certificate/synthetic-only.cer', expiresAt: Date.now() + 120000 }; },
    confirm: async ({ fingerprintFromPhone, confirmedTrust }) => { assert.equal(fingerprintFromPhone, 'AB:'.repeat(31) + 'AB'); assert.equal(confirmedTrust, true); setupState = { available: false, phase: 'complete', phoneEndToEndVerified: false }; },
    cancel: async () => { setupState = { available: true, phase: 'interrupted' }; }
  },
  status: () => localState,
  inspectNetworks: async () => ({ connected: localState.connectedNetworks }),
  trustNetwork: async key => {
    if (denyTrust) { denyTrust = false; throw operationError('ERR_PERMISSION_CANCELLED'); }
    const net = localState.connectedNetworks.find(net => net.key === key);
    localState.allowedNetworks.push({ ...net, connection: net.interfaceAlias, active: false }); net.trusted = true;
    return { ok: true, message: 'Ağ güvenilen listeye eklendi.' };
  },
  removeNetwork: async key => { localState.allowedNetworks = localState.allowedNetworks.filter(net => net.key !== key); localState.connectedNetworks.find(net => net.key === key).trusted = false; return { ok: true, message: 'Ağ güvenilen listeden çıkarıldı.' }; }
} });
let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const token = await readFile(path.join(root, 'desktop-token'), 'utf8');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 840 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  // Stub clipboard writes so copy-address button tests do not change the real clipboard.
  await page.addInitScript(() => Object.defineProperty(navigator.clipboard, 'writeText', { value: async text => { window.__copiedAddress = text; } }));
  await page.goto(`http://127.0.0.1:${server.address().port}/#token=${token}`);
  await page.locator('#machine').filter({ hasText: fixtureMachine }).waitFor();
  assert.equal(await page.locator('#empty').isVisible(), true);
  await page.locator('#capture').click();
  await page.locator('.card').waitFor();
  assert.equal(history.list().items.length, 1);
  const textId = await history.record({ type: 'text', content: 'Türkçe karakterler yerli yerinde.\nİstanbul, ışık, özgürlük. 🌿\n<script>window.__unsafe = true</script>' }, 'inbound');
  await history.record({ type: 'image', data: await sharp({ create: { width: 128, height: 128, channels: 3, background: '#60c8a0' } }).png().toBuffer(), filename: 'Demo.png', mimeType: 'image/png' }, 'outbound');
  const source = path.join(root, 'Sunum notları.pdf'); await writeFile(source, '%PDF-1.4\nUI fixture');
  await history.record({ type: 'file', path: source, filename: 'Sunum notları.pdf', mimeType: 'application/pdf' }, 'inbound');
  await page.locator('#refresh').click();
  await page.locator('.card').nth(3).waitFor();
  assert.equal(await page.evaluate(() => window.__unsafe), undefined);
  await page.locator(`[data-id="${textId}"] [data-action="favorite"]`).click();
  await page.locator(`[data-id="${textId}"] .favorite.selected`).waitFor();
  await page.locator('[data-view="favorites"]').click();
  assert.equal(await page.locator('.card').count(), 1);
  await page.locator('[data-view="history"]').click();
  await page.locator('#search').fill('Türkçe'); assert.equal(await page.locator('.card').count(), 1);
  await page.locator('.card-open').click(); await page.locator('#details[open]').waitFor();
  assert.ok((await page.locator('.detail-text').textContent()).includes('İstanbul'));
  await page.locator('#details .close-dialog').click();
  await page.locator('#search').fill('');
  await page.locator('[data-filter="image"]').click(); assert.equal(await page.locator('.card').count(), 1);
  await page.locator('[data-filter="all"]').click();
  await mkdir('build', { recursive: true });
  await page.screenshot({ path: 'build/desktop-ui-test.png', fullPage: true });
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(244, 246, 243)');
  await page.waitForTimeout(250); // Let the existing button transitions settle for the screenshot.
  await page.screenshot({ path: 'build/desktop-ui-light.png', fullPage: true });
  await page.goto(`http://127.0.0.1:${server.address().port}/#token=${token}`);
  await page.locator('#machine').filter({ hasText: fixtureMachine }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.locator('[data-view="settings"]').click();
  assert.equal(await page.locator('#theme-select').inputValue(), 'light');
  assert.ok((await page.locator('#storage-usage').textContent()).includes('Toplam:'));
  await page.locator('#storage-retention').selectOption('30');
  await page.waitForFunction(() => !document.querySelector('#storage-cleanup').disabled);
  assert.equal((await storage.summary()).retentionDays, 30);
  await page.locator('#storage-cleanup').click(); await page.locator('#cancel').click();
  await page.screenshot({ path: 'build/desktop-settings-light.png', fullPage: true });
  await page.locator('#theme-select').selectOption('dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('panokopru-theme')), 'dark');
  await page.locator('[data-view="settings"]').click();
  await page.locator('#history-enabled').uncheck();
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('duraklatıldı'));
  assert.equal(history.list().settings.enabled, false);
  await page.locator('#history-enabled').check();
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('açıldı'));
  await page.locator('[data-view="connection"]').click(); assert.equal(await page.locator('#network-detail').isVisible(), true);
  assert.equal(await page.locator('.trusted-network').count(), 3);
  assert.ok((await page.locator('.trusted-network.active').textContent()).includes('Demo Hotspot'));
  assert.equal(await page.locator('#local-badge').textContent(), 'HTTPS · HAZIR');
  assert.equal(await page.locator('#connected-networks img').count(), 0);
  await page.getByRole('button', { name: 'Bağlı ağları yenile' }).click();
  await page.getByRole('button', { name: 'Bu ağı güvenilenlere ekle' }).click();
  assert.ok((await page.locator('#confirm-text').textContent()).includes('diğer uygulamaların'));
  await page.locator('#cancel').click(); assert.equal(localState.allowedNetworks.length, 3);
  await page.getByRole('button', { name: 'Bu ağı güvenilenlere ekle' }).click();
  await page.getByRole('button', { name: 'Güven ve devam et' }).click();
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('iptal edildi'));
  assert.equal(localState.allowedNetworks.length, 3);
  await page.getByRole('button', { name: 'Bu ağı güvenilenlere ekle' }).click();
  await page.getByRole('button', { name: 'Güven ve devam et' }).click();
  await page.locator('.trusted-network').nth(3).waitFor();
  await page.locator('.trusted-network').nth(3).getByRole('button', { name: 'Listeden çıkar' }).click();
  await page.locator('#cancel').click(); assert.equal(localState.allowedNetworks.length, 4);
  await page.locator('.trusted-network').nth(3).getByRole('button', { name: 'Listeden çıkar' }).click();
  await page.locator('#confirm-ok').click();
  await page.waitForFunction(() => document.querySelectorAll('.trusted-network').length === 3);
  await page.locator('.connection-details summary').click();
  await page.locator('[data-copy-endpoint="clipboard"]').click();
  assert.equal(await page.evaluate(() => window.__copiedAddress), 'https://panokopru-1234abcd.local:32147/api/v1/clipboard');
  await page.locator('[data-copy-endpoint="kind"]').click();
  assert.equal(await page.evaluate(() => window.__copiedAddress), 'https://panokopru-1234abcd.local:32147/api/v1/clipboard/kind');
  await page.locator('[data-copy-endpoint="health"]').click();
  assert.equal(await page.evaluate(() => window.__copiedAddress), 'https://panokopru-1234abcd.local:32147/health');
  await page.evaluate(() => { document.querySelector('#toast').hidden = true; });
  await page.screenshot({ path: 'build/desktop-connection-dark.png', fullPage: true });
  await page.locator('#theme-toggle').click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'build/desktop-connection-light.png', fullPage: true });
  await page.setViewportSize({ width: 880, height: 660 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  localState = { ...localState, state: 'away', activeNetworkName: null, allowedNetworks: localState.allowedNetworks.map(net => ({ ...net, active: false })) };
  await page.locator('#refresh').click();
  await page.waitForFunction(() => document.querySelector('#local-status').textContent.includes('İzinli bir ağda değilsin'));
  assert.equal(await page.locator('.trusted-network.active').count(), 0);
  assert.equal(await page.locator('#network-operation').isVisible(), false);
  localState = { ...localState, state: 'needs_permission' };
  await page.locator('#refresh').click();
  await page.waitForFunction(() => document.querySelector('#local-status').textContent.includes('İzni onar'));
  localState = { configured: false, state: 'not_configured' };
  await page.locator('#refresh').click();
  await page.waitForFunction(() => document.querySelector('[data-copy-endpoint]').disabled);
  assert.equal(await page.locator('#local-setup').isDisabled(), true);
  setupState = { available: true, phase: 'not_started', busy: false };
  await page.locator('#refresh').click();
  await page.waitForFunction(() => !document.querySelector('#setup-wizard').disabled);
  await page.locator('#setup-wizard').click();
  await page.locator('#setup-dialog[open]').waitFor();
  assert.equal(await page.locator('#setup-network script').count(), 0);
  await page.locator('#setup-begin').click();
  await page.locator('#setup-certificate').waitFor({ state: 'visible' });
  await page.locator('#setup-phone-fingerprint').fill('AB:'.repeat(31) + 'AB');
  await page.locator('#setup-trust').check();
  await page.screenshot({ path: 'build/desktop-setup-synthetic.png', fullPage: true });
  await page.locator('#setup-confirm').click();
  await page.waitForFunction(() => document.querySelector('#setup-status').textContent.includes('Windows tarafı hazır'));
  assert.equal(setupState.phoneEndToEndVerified, false);
  await page.locator('#setup-dialog .close-dialog').click();
  await page.locator('[data-view="history"]').click();
  await page.setViewportSize({ width: 880, height: 660 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 1280, height: 840 });
  await page.locator('[data-view="settings"]').click();
  await page.locator('#clear').click(); await page.locator('#cancel').click(); assert.equal(history.list().items.length, 4);
  await page.locator('#clear').click(); await page.locator('#confirm-ok').click();
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Geçmiş temizlendi'));
  assert.equal(history.list().items.length, 0);
  assert.equal((await readFile(source, 'utf8')).startsWith('%PDF'), true);
  assert.deepEqual(errors, []);
  console.log('UI PASS: empty state, capture, Unicode/XSS, favorites, search, filters, details, pause, settings, connection, responsive layout, clear confirmation, original file preservation.');
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
