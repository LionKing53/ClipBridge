// Compile-only setup bound to a verified candidate. Explicit private test builds
// are installable; default guarded candidates stay blocked. Never launch here.
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertNoLinks, within } from '../src/runtime-context.js';
import { verifyRelease } from '../src/release-store.js';
import { packageFiles, hashFile } from '../src/package-files.js';
import { archiveFiles } from './distribution-layout.js';
const root = fileURLToPath(new URL('../', import.meta.url)), run = promisify(execFile);
const work = process.argv[2] && path.resolve(process.argv[2]);
if (process.platform !== 'win32' || process.arch !== 'x64' || !work || !within(path.join(root, 'build'), work) || !/^candidate-[a-f0-9-]{36}$/.test(path.basename(work))) throw new Error('Explicit owned guarded candidate directory required.');
await assertNoLinks(work);
const evidence = JSON.parse(await readFile(path.join(work, 'candidate-evidence.json'), 'utf8'));
const manifest = await verifyRelease(path.join(work, 'payload'), evidence.hash);
const source = (await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim();
if ((await run('git', ['status', '--porcelain'], { cwd: root, windowsHide: true })).stdout.trim() || manifest.commit !== source || evidence.commit !== source || !['guarded-engineering-candidate', 'installable-private-acceptance', 'installable-experimental-release'].includes(evidence.purpose)) throw new Error('Matching clean committed candidate required.');
const guard = await lstat(path.join(work, 'payload', 'app', 'SOURCE-CHECKOUT')).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
if (!!guard !== (evidence.purpose === 'guarded-engineering-candidate')) throw new Error('Payload guard differs from explicit build policy.');
const toolchain = JSON.parse(await readFile(path.join(root, 'toolchain-lock.json'), 'utf8'));
const policy = path.join(work, 'setup-policy.json'), exe = path.join(work, 'ClipBridgeSetup.exe');
const embedded = path.join(work, 'embedded-payload.zip');
const archive = await archiveFiles(embedded, (await packageFiles(path.join(work, 'payload'))).map(name => ({ name, file: path.join(work, 'payload', name) })), { embeddedPayload: true });
await verifyRelease(path.join(work, 'payload'), evidence.hash);
await writeFile(policy, JSON.stringify({ manifestHash: evidence.hash, nodeVersion: toolchain.artifacts.find(item => item.id === 'node').version,
  minimumWebView2Version: '120.0.0.0', payloadArchiveHash: archive.sha256 }), { flag: 'wx' });
const sources = ['launcher/Setup.cs', 'launcher/EmbeddedPayload.cs', 'launcher/Language.cs', 'launcher/FreshInstall.cs', 'launcher/RemoveInstall.cs', 'launcher/WindowsFreshInstall.cs', 'launcher/InstalledLaunch.cs', 'scripts/InstallProbe.cs'];
await run(path.join(process.env.SystemRoot, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:winexe', '/platform:x64',
  '/win32manifest:' + path.join(root, 'launcher/app.manifest'), '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.Web.Extensions.dll',
  '/reference:System.IO.Compression.dll',
  ...['messages','native','errors'].map((name,i) => '/resource:' + path.join(root,'locales',name+'.json') + ',' + ['Messages','NativeMessages','ErrorMessages'][i]),
  '/resource:' + policy + ',SetupPolicy', '/resource:' + embedded + ',SetupPayload', '/out:' + exe, ...sources.map(name => path.join(root, name))], { windowsHide: true, timeout: 60000 });
if (await hashFile(embedded) !== archive.sha256) throw new Error('Embedded payload changed during build.');
if ((await run('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true })).stdout.trim() !== source ||
    (await run('git', ['status', '--porcelain'], { cwd: root, windowsHide: true })).stdout.trim()) throw new Error('Source changed during Setup compilation.');
const hashes = {};
for (const name of [...sources, ...['messages','native','errors'].map(name => 'locales/' + name + '.json')]) hashes[name] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
await writeFile(path.join(work, 'setup-build-evidence.json'), JSON.stringify({ format: 1, purpose: evidence.purpose, version: evidence.version, commit: source,
  payloadManifestHash: evidence.hash, executableSHA256: createHash('sha256').update(await readFile(exe)).digest('hex'), sourceHashes: hashes,
  embeddedPayload: { resource: 'SetupPayload', sha256: archive.sha256, entries: archive.entries }, standalone: true,
  signed: false, launched: false, installed: false, approvedForPublication: false }, null, 2), { flag: 'wx' });
await run(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'), [
  '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/verify-setup.ps1'),
  '-Candidate',path.relative(root,work)
], {windowsHide:true,timeout:120000,maxBuffer:32768});
console.log('Setup compile PASS: ' + evidence.purpose + '. No app or installer launched.');
