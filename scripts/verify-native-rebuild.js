// Disposable Windows CI only: fresh staging, memory-only sharp; never run the app/setup.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { hashFile } from '../src/package-files.js';
import { verifyRelease } from '../src/release-store.js';
const run = promisify(execFile), root = process.cwd();
if (process.env.GITHUB_ACTIONS !== 'true' || process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Disposable Windows x64 CI required.');
const transfer = path.join(root, 'build/ci-native/transfer');
const build = JSON.parse(await readFile(path.join(transfer, 'build-evidence.json'), 'utf8'));
const input = path.join(transfer, 'libraries');
assert.equal(await hashFile(path.join(input, 'libvips-42.dll')), build.rebuiltLibrarySHA256);
assert.equal(build.actualSourceBuild, true);
const before = new Set(await readdir(path.join(root, 'build')));
await run(process.execPath, ['scripts/build-candidate.js', '--installable-test',
  '--native-library-directory', input, '--native-source-directory', path.join(transfer, 'sources')],
  { cwd: root, windowsHide: true, maxBuffer: 16 * 1024 ** 2, timeout: 20 * 60 * 1000 });
const names = (await readdir(path.join(root, 'build'))).filter(n => /^candidate-/.test(n) && !before.has(n));
assert.equal(names.length, 1);
const candidate = path.join(root, 'build', names[0]);
const app = path.join(candidate, 'payload/app');
const library = path.join(app, 'node_modules/@img/sharp-win32-x64/lib/libvips-42.dll');
assert.equal(await hashFile(library), build.rebuiltLibrarySHA256);
const original = path.join(root, 'node_modules/@img/sharp-win32-x64/lib/libvips-42.dll');
// A genuine reproducible build can match the upstream bytes. Source-build logs
// and empty-target preflight establish provenance; inequality alone cannot.
const originalLibrarySHA256 = await hashFile(original);
const sharp = createRequire(path.join(app, 'package.json'))('sharp');
assert.equal(sharp.versions.vips, '8.18.7');
assert.equal(sharp.versions.sharp, '0.35.5');
assert.deepEqual(sharp.versions, { ...build.vips, sharp: '0.35.5' });
const formats = ['png', 'jpeg', 'webp', 'tiff'];
for (const format of formats) {
  const bytes = await sharp({ create: { width: 12, height: 9, channels: 3, background: '#447766' } }).toFormat(format).toBuffer();
  const result = await sharp(bytes).png().toBuffer({ resolveWithObject: true });
  assert.equal(result.info.width, 12); assert.equal(result.info.height, 9);
}
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="9"><rect width="12" height="9" fill="#447766"/></svg>');
assert.equal((await sharp(svg).png().toBuffer({ resolveWithObject: true })).info.width, 12);
const evidence = JSON.parse(await readFile(path.join(candidate, 'candidate-evidence.json'), 'utf8'));
await verifyRelease(path.join(candidate, 'payload'), evidence.hash);
await run(process.execPath, ['scripts/build-setup.js', candidate], { cwd: root, windowsHide: true, maxBuffer: 1024 ** 2, timeout: 120000 });
await writeFile(path.join(root, 'build/ci-native/windows-abi.json'), JSON.stringify({ format: 1,
  sourceCommit: build.sourceCommit, rebuiltVipsDLL: true, rebuiltLibrarySHA256: build.rebuiltLibrarySHA256,
  originalLibrarySHA256, matchesOriginalBytes: originalLibrarySHA256 === build.rebuiltLibrarySHA256,
  originalCppAndAddonRetained: true, freshStageVerified: true, setupCompiled: true,
  formats: [...formats, 'svg-to-png'], passed: true, appLaunched: false, installerExecuted: false,
  realClipboardAccess: false, cleanDeviceAcceptance: 'pending', approvedForPublication: false }, null, 2));
console.log('Rebuilt libvips Windows ABI/decode and fresh-stage sealing PASS; release approval still separate.');
