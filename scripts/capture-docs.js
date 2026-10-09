// Real application localization with isolated synthetic documentation adapters.
import { chromium } from '@playwright/test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createHistory } from '../src/history.js';
import { createDesktopServer } from '../src/desktop-server.js';
import { createTestSystem } from '../test/support/desktop-system.js';

const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-doc-preview-'));
let browser, server;
const output = path.resolve('build/docs-preview');
try {
  const history = await createHistory(root);
  const note = await history.record({ type: 'text', content: 'Ideas worth keeping.\nCopy on one device. Continue on the other.', filename: 'Project notes' }, 'inbound');
  await history.favorite(note);
  const photo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#dceae4"/><circle cx="495" cy="95" r="42" fill="#f1c772"/><path d="M0 360L210 105L440 420H0Z" fill="#729b89"/><path d="M170 420L430 165L640 375V420Z" fill="#3c6a58"/></svg>');
  await history.record({ type: 'image', data: await sharp(photo).png().toBuffer(), filename: 'Landscape.png', mimeType: 'image/png' }, 'outbound');
  const document = path.join(root, 'Trip checklist.pdf'); await writeFile(document, '%PDF-1.4\nSynthetic documentation fixture');
  await history.record({ type: 'file', path: document, filename: 'Trip checklist.pdf', mimeType: 'application/pdf' }, 'inbound');
  await history.record({ type: 'text', content: 'Meeting link and next steps\nSaved manually from the demo clipboard.', filename: 'Meeting notes' }, 'local');
  const local = { configured: true, state: 'ready', canCleanupPermissions: true, hostname: 'clipbridge-1234abcd.local', port: 32147, activeNetworkName: 'Demo Home',
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
  // Use the application's real language preference, then verify it survives reload.
  await page.locator('[data-view="settings"]').click();
  await page.locator('#language-select').selectOption('en');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.equal(JSON.parse(await readFile(path.join(root, 'ui-settings.json'), 'utf8')).language, 'en');
  // The launcher supplies a fresh authenticated URL on each opening.
  await page.goto(`http://127.0.0.1:${server.address().port}/#token=${token}`);
  await page.reload();
  await page.locator('.card').nth(3).waitFor();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await page.locator('.card-preview img').waitFor();
  await page.screenshot({ path: path.join(output, 'history-dark.png'), animations: 'disabled', fullPage: true });
  await page.locator('#theme-toggle').click();
  await page.screenshot({ path: path.join(output, 'history-light.png'), animations: 'disabled', fullPage: true });
  await page.locator('[data-view="connection"]').click();
  // Capture the actual local-network panel; remote/pairing dialogs remain unopened.
  await page.locator('.local-panel').screenshot({ path: path.join(output, 'trusted-networks.png'), animations: 'disabled' });
  await page.locator('#setup-wizard').click();
  await page.locator('#setup-dialog[open]').waitFor();
  await page.locator('#setup-dialog').screenshot({ path: path.join(output, 'first-time-setup.png'), animations: 'disabled' });
  assert.deepEqual(errors, []);
  assert.equal(await page.locator('#qr').getAttribute('src'), null);
  console.log('Documentation capture PASS: four real English UI captures with synthetic data; no OS/clipboard/network-permission actions or pairing QR.');
} finally {
  await browser?.close();
  if (server?.listening) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(root, { recursive: true, force: true });
}
