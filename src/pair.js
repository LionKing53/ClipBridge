import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import QRCode from "qrcode";
import { loadConfig } from "./config.js";

const execFileAsync = promisify(execFile);
const config = await loadConfig();

let status;
try {
  const { stdout } = await execFileAsync("tailscale.exe", ["status", "--json"], {
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024
  });
  status = JSON.parse(stdout);
} catch (error) {
  throw new Error(`Tailscale durumu okunamadi: ${error.message}`);
}

const dnsName = status?.Self?.DNSName?.replace(/\.$/, "");
if (!dnsName) {
  throw new Error("Bu bilgisayar icin Tailscale MagicDNS adi bulunamadi.");
}

const pairUrl = `https://${dnsName}/setup#token=${encodeURIComponent(config.token)}`;
const qr = await QRCode.toString(pairUrl, { type: "terminal", small: true });
const qrDataUrl = await QRCode.toDataURL(pairUrl, { errorCorrectionLevel: "M", width: 720, margin: 3 });
const pairPagePath = path.join(path.dirname(config.configPath), "eslestirme.html");
const pairPage = `<!doctype html>
<html lang="tr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>iPhone Pano Köprüsü Eşleştirme</title>
<style>
  body { font-family: system-ui, sans-serif; text-align: center; margin: 2rem; }
  img { width: min(80vw, 540px); height: auto; image-rendering: pixelated; }
</style>
<h1>iPhone ile bu QR kodu tara</h1>
<p>iPhone'da Tailscale bağlı olmalı. Kamera uygulamasını aç ve QR koda tut.</p>
<img src="${qrDataUrl}" alt="Eşleştirme QR kodu">
</html>`;

await writeFile(pairPagePath, pairPage, "utf8");
await execFileAsync("explorer.exe", [pairPagePath], { windowsHide: true });

console.log("iPhone kamerasi ile bu QR kodu tara:\n");
console.log(qr);
console.log("QR kodu tarayicida da acildi.");
console.log("Sayfa iPhone'da acildiginda API adresini ve Authorization degerini kopyalayabilirsin.");
