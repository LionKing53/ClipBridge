// Explicit guarded or private-installable bundle. Never runs its contents.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNative } from './build-native.js';
import { copyApprovedFiles, packageFiles, sealCandidate, hashFile } from '../src/package-files.js';
import { assertNoLinks } from '../src/runtime-context.js';
import { applyNativeOverride } from '../src/native-override.js';
import { assertSourceCoverage } from './fetch-native-sources.js';
const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const installable = process.argv.includes('--installable-test');
const options = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]; if (arg === '--installable-test') continue;
  if (!['--native-library-directory','--native-source-directory'].includes(arg) || options[arg] || !process.argv[i+1] || process.argv[i+1].startsWith('--')) throw new Error('Unknown, duplicate or incomplete build option');
  options[arg] = path.resolve(process.argv[++i]);
}
const overrideDirectory = options['--native-library-directory'];
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const git = async (...args) => (await run('git', args, { cwd: root, windowsHide: true })).stdout.trim();
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Candidate target is Windows x64.');
if (await git('status', '--porcelain')) throw new Error('Commit reviewed source changes before building a candidate.');
await run(process.execPath, [path.join(root, 'scripts/check-source.js')], { cwd: root, windowsHide: true });
const commit = await git('rev-parse', 'HEAD');
const inputs = JSON.parse(await readFile(path.join(root, 'distribution-inputs.json'), 'utf8'));
const source = JSON.parse(await readFile(path.join(root, 'source-manifest.json'), 'utf8'));
if (inputs.format !== 1 || !inputs.app.includes('SOURCE-CHECKOUT') || inputs.app.some(name => !source.files.includes(name))) throw new Error('Unapproved application inputs.');
const snapshot = {};
for (const name of source.files) snapshot[name] = await hashFile(path.join(root, name));
const native = await buildNative();
const evidence = JSON.parse(await readFile(path.join(native, 'build-evidence.json'), 'utf8'));
if (evidence.baseCommit !== commit || evidence.dirtySource) throw new Error('Native build has different source provenance.');
const work = path.join(root, 'build', 'candidate-' + randomUUID());
const payload = path.join(work, 'payload'), app = path.join(payload, 'app');
await assertNoLinks(work); await mkdir(work);
await copyApprovedFiles(root, app, inputs.app.filter(name => !installable || name !== 'SOURCE-CHECKOUT'));
await copyApprovedFiles(root, path.join(payload, 'source'), source.files);
await copyApprovedFiles(native, payload, inputs.native);
// Fresh install; never copy source node_modules or the user's runtime/vendor.
// Separate blank npm configs/cache prevent user registry credentials/config from
// becoming build inputs. No dependency lifecycle scripts or candidate exe runs.
await writeFile(path.join(work, 'npm-user.config'), '', { flag: 'wx' });
await writeFile(path.join(work, 'npm-global.config'), '', { flag: 'wx' });
const env = { ...process.env };
for (const key of Object.keys(env)) if (/^npm_config_/i.test(key) || /^(NODE_OPTIONS|NODE_PATH|NODE_TLS_REJECT_UNAUTHORIZED)$/i.test(key)) delete env[key];
Object.assign(env, { NPM_CONFIG_USERCONFIG: path.join(work, 'npm-user.config'), NPM_CONFIG_GLOBALCONFIG: path.join(work, 'npm-global.config'), NPM_CONFIG_CACHE: path.join(work, 'npm-cache') });
await run(path.join(process.env.SystemRoot, 'System32', 'cmd.exe'), ['/d', '/s', '/c', 'npm.cmd ci --omit=dev --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org'],
  { cwd: app, env, windowsHide: true, timeout: 180000, maxBuffer: 1024 * 1024 });

const lock = JSON.parse(await readFile(path.join(app, 'package-lock.json'), 'utf8'));
const installedLock = JSON.parse(await readFile(path.join(app, 'node_modules', '.package-lock.json'), 'utf8'));
const nativeOverride = overrideDirectory ? await applyNativeOverride(root, app, overrideDirectory) : null;
const components = [], licenses = [], inventory = [];
for (const location of Object.keys(installedLock.packages).sort()) {
  const entry = lock.packages[location];
  if (!entry || entry.dev || installedLock.packages[location].integrity !== entry.integrity || !/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(location)) throw new Error('Unexpected installed dependency.');
  const directory = path.join(app, location);
  await assertNoLinks(directory);
  const metadata = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
  if (metadata.version !== entry.version) throw new Error('Installed package version differs from lock.');
  const names = await packageFiles(directory);
  const evidenceFiles = names.filter(name => !name.includes('node_modules/') &&
    (/^(license|licence|copying|notice|copyright)([.-]|$)/i.test(path.posix.basename(name)) ||
    (metadata.name === '@img/sharp-win32-x64' && /^(README.md|versions.json)$/.test(name))));
  const texts = [];
  for (const name of evidenceFiles) {
    const content = await readFile(path.join(directory, name));
    if (content.length > 2 * 1024 ** 2 || content.includes(0)) throw new Error('License evidence needs separate review.');
    texts.push({ path: name, sha256: await hashFile(path.join(directory, name)) });
    licenses.push(`\n===== ${metadata.name}@${metadata.version}: ${name} =====\n${content.toString('utf8')}\n`);
  }
  inventory.push({ location, name: metadata.name, version: metadata.version, license: metadata.license || entry.license || null,
    artifact: entry.resolved, integrity: entry.integrity, licenseFiles: texts, distributionReviewRequired: true });
  components.push({ type: 'library', 'bom-ref': location, name: metadata.name, version: metadata.version,
    purl: `pkg:npm/${metadata.name.replace('@', '%40')}@${metadata.version}`,
    hashes: [{ alg: 'SHA-512', content: Buffer.from(entry.integrity.slice(7), 'base64').toString('hex') }],
    externalReferences: [{ type: 'distribution', url: entry.resolved }] });
}
const toolchain = JSON.parse(await readFile(path.join(root, 'toolchain-lock.json'), 'utf8'));
for (const artifact of toolchain.artifacts) components.push({ type: artifact.id === 'node' ? 'application' : 'library',
  'bom-ref': 'native:' + artifact.id, name: artifact.id, version: artifact.version,
  hashes: [{ alg: artifact.algorithm === 'sha256' ? 'SHA-256' : 'SHA-512', content: artifact.encoding === 'hex' ? artifact.integrity : Buffer.from(artifact.integrity, 'base64').toString('hex') }],
  externalReferences: [{ type: 'distribution', url: artifact.url }],
  properties: [{ name: 'clipbridge:hashScope', value: 'upstream archive; extracted file hashes in toolchain-evidence.json' }] });
await mkdir(path.join(payload, 'review'));
if (nativeOverride) await writeFile(path.join(payload, 'review/native-modifications.json'), JSON.stringify(nativeOverride, null, 2));
if (options['--native-source-directory']) {
  const directory = options['--native-source-directory']; await assertNoLinks(directory);
  const evidence = JSON.parse(await readFile(path.join(directory, 'evidence.json'), 'utf8'));
  const inventory = JSON.parse(await readFile(path.join(directory, 'inventory.json'), 'utf8'));
  const lock = JSON.parse(await readFile(path.join(root, 'native-sources-lock.json'), 'utf8'));
  const bundleName = 'ClipBridge-sharp-0.35.5-sources.zip';
  if (inventory.sharp !== lock.sharp || evidence.nativeArchives !== lock.artifacts.length || evidence.recipeArchives !== Object.keys(lock.recipes).length || evidence.sha256 !== await hashFile(path.join(directory,bundleName))) throw new Error('Wrong native source companion');
  if ((evidence.runtimeArchives || 0) !== (lock.runtimeArtifacts || []).length) throw new Error('Missing compiler-runtime source coverage');
  assertSourceCoverage(lock, inventory);
  await mkdir(path.join(payload,'sources'));
  await copyFile(path.join(directory,bundleName),path.join(payload,'sources',bundleName));
  await copyFile(path.join(directory,'NATIVE-NOTICES.txt'),path.join(payload,'review/NATIVE-NOTICES.txt'));
  await writeFile(path.join(payload,'review/native-source-delivery.json'),JSON.stringify({ ...evidence, bundle: 'sources/' + bundleName, nativeRebuildVerification: 'deferred-to-separate-environment', modifiedLibrarySourcesIncluded: !nativeOverride },null,2));
}
const limitations = [installable ? 'Installable PRIVATE acceptance package, not approved for public redistribution.' : 'Engineering candidate, not installable or approved for redistribution.',
  installable ? 'Runtime guard omitted by explicit build; source snapshot guard retained. No app or installer executed.' : 'SOURCE-CHECKOUT guard retained. No app or installer executed.',
  'WebView2 Runtime not bundled; SDK libraries are not the Runtime.', 'Dependency/component inventory is not a vulnerability audit or license approval.',
  'sharp/libvips corresponding-source and replacement requirements still need distribution review.', 'Real Windows/iPhone acceptance pending. Clean install only; updater, rollback and legacy migration out of scope.'];
await writeFile(path.join(payload, 'review', 'inventory.json'), JSON.stringify({ format: 1, commit, target: 'win-x64', limitations, packages: inventory }, null, 2));
await writeFile(path.join(payload, 'review', 'candidate.cdx.json'), JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
  metadata: { component: { type: 'application', name: 'ClipBridge', version },
    properties: [{ name: 'clipbridge:sourceCommit', value: commit }, { name: 'clipbridge:status', value: installable ? 'private-acceptance-only' : 'not-installable-not-release-approved' }] }, components }, null, 2));
await writeFile(path.join(payload, 'review', 'DEPENDENCY-NOTICES.txt'), 'Collected from the exact freshly installed package versions. Distribution review remains required.\n' + licenses.join(''));
await writeFile(path.join(payload, installable ? 'TEST-PACKAGE.txt' : 'NOT-INSTALLABLE.txt'), limitations.join('\n') + '\n');
// Source must not change underneath the build. A clean git tree alone would not
// detect an editor changing and committing inputs while this process runs.
for (const name of source.files) {
  if (await hashFile(path.join(root, name)) !== snapshot[name] || await hashFile(path.join(payload, 'source', name)) !== snapshot[name]) throw new Error('Source changed during packaging.');
}
if (await git('rev-parse', 'HEAD') !== commit || await git('status', '--porcelain')) throw new Error('Source provenance changed during packaging.');
const result = await sealCandidate(payload, { version, commit });
await writeFile(path.join(work, 'candidate-evidence.json'), JSON.stringify({ format: 1, purpose: installable ? 'installable-private-acceptance' : 'guarded-engineering-candidate', version, commit,
  ...result, dependencies: inventory.length, installed: false, launched: false, approvedForPublication: false }, null, 2));
console.log(`Candidate integrity PASS: ${result.files} files, ${inventory.length} production dependencies.`);
console.log('Output: ' + path.relative(root, work));
console.log(installable ? 'Installable private acceptance only, not publication approved. Personal installation unchanged.' : 'Guarded candidate, not installable.');
