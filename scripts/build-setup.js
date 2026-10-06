// Compile-only standalone first-installer, bound to an already verified guarded
// candidate. It deliberately cannot install that candidate. Do not launch it.
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertNoLinks, within } from '../src/runtime-context.js';
import { verifyRelease } from '../src/release-store.js';
const root = fileURLToPath(new URL('../', import.meta.url)), run = promisify(execFile);
const work = process.argv[2] && path.resolve(process.argv[2]);
if (process.platform !== 'win32' || process.arch !== 'x64' || !work || !within(path.join(root, 'build'), work) || !/^candidate-[a-f0-9-]{36}$/.test(path.basename(work))) throw new Error('Explicit owned guarded candidate directory required.');
await assertNoLinks(work);
const evidence = JSON.parse(await readFile(path.join(work, 'candidate-evidence.json'), 'utf8'));
const manifest = await verifyRelease(path.join(work, 'payload'), evidence.hash);
const source = (await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
if ((await run('git', ['status', '--porcelain'], { cwd: root, windowsHide: true })).stdout.trim() || manifest.commit !== source || evidence.commit !== source || evidence.purpose !== 'guarded-engineering-candidate') throw new Error('Matching clean committed candidate required.');
await readFile(path.join(work, 'payload', 'app', 'SOURCE-CHECKOUT')); // Never silently produce an installable release.
const toolchain = JSON.parse(await readFile(path.join(root, 'toolchain-lock.json'), 'utf8'));
const policy = path.join(work, 'setup-policy.json'), exe = path.join(work, 'PanoKopruSetup.exe');
await writeFile(policy, JSON.stringify({ manifestHash: evidence.hash, nodeVersion: toolchain.artifacts.find(item => item.id === 'node').version,
  minimumWebView2Version: '120.0.0.0' }), { flag: 'wx' });
const sources = ['launcher/Setup.cs', 'launcher/FreshInstall.cs', 'launcher/WindowsFreshInstall.cs', 'launcher/InstalledLaunch.cs', 'scripts/InstallProbe.cs'];
await run(path.join(process.env.SystemRoot, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:winexe', '/platform:x64',
  '/win32manifest:' + path.join(root, 'launcher/app.manifest'), '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.Web.Extensions.dll',
  '/resource:' + policy + ',SetupPolicy', '/out:' + exe, ...sources.map(name => path.join(root, name))], { windowsHide: true, timeout: 60000 });
const hashes = {};
for (const name of sources) hashes[name] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
await writeFile(path.join(work, 'setup-build-evidence.json'), JSON.stringify({ format: 1, purpose: 'guarded-setup-compile-only', commit: source,
  payloadManifestHash: evidence.hash, executableSHA256: createHash('sha256').update(await readFile(exe)).digest('hex'), sourceHashes: hashes,
  signed: false, launched: false, installed: false, approvedForPublication: false }, null, 2), { flag: 'wx' });
console.log('Standalone setup compile PASS; guarded payload remains not installable. No program or installer was launched.');
