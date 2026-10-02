import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import pngToIco from "png-to-ico";
import sharp from "sharp";
import { assertProductionReady } from './source-guard.js';

assertProductionReady();

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const buildDirectory = path.join(projectRoot, "build");
const executablePath = path.join(buildDirectory, "PanoKopru.exe");
const iconPath = path.join(projectRoot, "assets", "PanoKopru.ico");
const svgPath = path.join(projectRoot, "assets", "PanoKopru.svg");

await mkdir(buildDirectory, { recursive: true });

const svg = await readFile(svgPath);
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer())
);
await writeFile(iconPath, await pngToIco(pngs));
await writeFile(path.join(projectRoot, "assets", "PanoKopru.png"), pngs.at(-1));

const compilerCandidates = [
  "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe",
  "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe"
];
let compiler;
for (const candidate of compilerCandidates) {
  try {
    await readFile(candidate);
    compiler = candidate;
    break;
  } catch {}
}
if (!compiler) {
  throw new Error("Windows C# derleyicisi bulunamadi.");
}

await execFileAsync(compiler, [
  "/nologo",
  "/target:winexe",
  "/platform:x64",
  `/win32manifest:${path.join(projectRoot, 'launcher/app.manifest')}`,
  "/reference:System.Windows.Forms.dll",
  "/reference:System.Drawing.dll",
  "/reference:System.Web.Extensions.dll",
  `/reference:${path.join(projectRoot, 'vendor/webview2/lib/net462/Microsoft.Web.WebView2.Core.dll')}`,
  `/reference:${path.join(projectRoot, 'vendor/webview2/lib/net462/Microsoft.Web.WebView2.WinForms.dll')}`,
  `/win32icon:${iconPath}`,
  `/out:${executablePath}`,
  path.join(projectRoot, "launcher", "PanoKopru.cs"),
  path.join(projectRoot, "launcher", "RuntimeContext.cs"),
  path.join(projectRoot, "launcher", "DesktopWindow.cs")
], { cwd: projectRoot, windowsHide: true });

console.log(`Launcher hazir: ${executablePath}`);
for (const name of ['Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll']) {
  await copyFile(path.join(projectRoot, 'vendor/webview2/lib/net462', name), path.join(buildDirectory, name));
}
await copyFile(path.join(projectRoot, 'vendor/webview2/runtimes/win-x64/native/WebView2Loader.dll'), path.join(buildDirectory, 'WebView2Loader.dll'));
