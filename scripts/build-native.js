// Compile-only development artifact. Never install or start the native app.
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { assertNoLinks } from '../src/runtime-context.js';
const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
export async function buildNative() {
if (process.platform !== 'win32') throw new Error('Native build requires Windows x64 tools.');
const output = path.join(root, 'build', 'native-' + randomUUID());
await assertNoLinks(output);
const powershell = path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
await run(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts', 'extract-toolchain.ps1'), '-OutputDirectory', output], { windowsHide: true, timeout: 60000, maxBuffer: 32768 });
const svg = await readFile(path.join(root, 'assets', 'PanoKopru.svg'));
const pngs = await Promise.all([16,24,32,48,64,128,256].map(size => sharp(svg).resize(size, size).png().toBuffer()));
const icon = path.join(output, 'PanoKopru.ico'); await writeFile(icon, await pngToIco(pngs));
const compiler = path.join(process.env.SystemRoot, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
const exe = path.join(output, 'PanoKopru.exe');
const sources = ['launcher/PanoKopru.cs', 'launcher/RuntimeContext.cs', 'launcher/DesktopWindow.cs'];
const args = ['/nologo', '/target:winexe', '/platform:x64', '/win32manifest:' + path.join(root, 'launcher', 'app.manifest'),
  '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.Web.Extensions.dll',
  ...['Core','WinForms'].map(name => '/reference:' + path.join(output, 'sdk', `Microsoft.Web.WebView2.${name}.dll`)),
  '/win32icon:' + icon, '/out:' + exe, ...sources.map(name => path.join(root, name))];
await run(compiler, args, { windowsHide: true, timeout: 60000, cwd: output, maxBuffer: 32768 });
for (const name of ['Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll']) await copyFile(path.join(output, 'sdk', name), path.join(output, name));
await mkdir(path.join(output, 'app')); await copyFile(path.join(root, 'SOURCE-CHECKOUT'), path.join(output, 'app', 'SOURCE-CHECKOUT'));
const sourceHashes = {};
for (const name of [...sources, 'launcher/app.manifest', 'assets/PanoKopru.svg', 'toolchain-lock.json']) sourceHashes[name] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
const commit = (await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
const dirty = !!(await run('git', ['status', '--porcelain'], { cwd: root, windowsHide: true })).stdout.trim();
await writeFile(path.join(output, 'build-evidence.json'), JSON.stringify({ format: 1, purpose: 'compile-only-not-installable', baseCommit: commit, dirtySource: dirty, sourceHashes,
  executable: { bytes: (await readFile(exe)).length, sha256: createHash('sha256').update(await readFile(exe)).digest('hex') }, signed: false, installed: false, launched: false }, null, 2));
console.log('Native compile passed: ' + path.relative(root, output));
console.log('Compile-only artifact; no install, app launch, publication or personal-data access.');
return output;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildNative();
