import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import QRCode from "qrcode";
import { loadConfig } from "./config.js";
import { translate } from './i18n.js';

const execFileAsync = promisify(execFile);
const config = await loadConfig();
const language = config.preferences.get().language;
const t = key => translate(key, language);

let status;
try {
  const { stdout } = await execFileAsync("tailscale.exe", ["status", "--json"], {
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024
  });
  status = JSON.parse(stdout);
} catch (error) {
  throw new Error(t('pair.statusFailed'));
}

const dnsName = status?.Self?.DNSName?.replace(/\.$/, "");
if (!dnsName) {
  throw new Error(t('pair.dnsMissing'));
}

const pairUrl = `https://${dnsName}/setup#token=${encodeURIComponent(config.token)}`;
const qr = await QRCode.toString(pairUrl, { type: "terminal", small: true });
const qrDataUrl = await QRCode.toDataURL(pairUrl, { errorCorrectionLevel: "M", width: 720, margin: 3 });
const pairPagePath = path.join(path.dirname(config.configPath), "eslestirme.html");
const pairPage = `<!doctype html>
<html lang="${language}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('m_4d979b193d8e')}</title>
<style>
  body { font-family: system-ui, sans-serif; text-align: center; margin: 2rem; }
  img { width: min(80vw, 540px); height: auto; image-rendering: pixelated; }
</style>
<h1>${t('pair.scanTitle')}</h1>
<p>${t('pair.connectedInstruction')}</p>
<img src="${qrDataUrl}" alt="${t('m_e74f6bc2278b')}">
</html>`;

await writeFile(pairPagePath, pairPage, "utf8");
await execFileAsync("explorer.exe", [pairPagePath], { windowsHide: true });

console.log(t('pair.scanTitle') + ':\n');
console.log(qr);
console.log(t('pair.opened'));
console.log(t('pair.copyHint'));
