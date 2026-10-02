// Lockfile inventory, NOT a claim that a Windows distribution has been audited.
import { readFile, readdir, lstat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertNoLinks } from '../src/runtime-context.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const output = path.join(root, 'build', 'dependency-review');
const components = [], inventory = [], notices = [];
async function licenseFiles(directory, relative = '', depth = 0) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Linked package content is not reviewable.');
    const name = path.posix.join(relative, entry.name);
    if (entry.isFile() && /^(license|licence|copying|notice|copyright)([.-]|$)/i.test(entry.name)) result.push(name);
    if (depth < 2 && entry.isDirectory() && /^(licenses?|licences?|lib)$/i.test(entry.name)) result.push(...await licenseFiles(path.join(directory, entry.name), name, depth + 1));
  }
  return result.sort();
}
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location) continue;
  if (!/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(location) || location.includes('..') || location.includes('\\') || location.includes(':')) throw new Error('Unsafe package path.');
  const name = location.split('node_modules/').at(-1);
  const directory = path.join(root, location);
  await assertNoLinks(directory);
  const metadata = await readFile(path.join(directory, 'package.json'), 'utf8').then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (metadata && metadata.version !== entry.version) throw new Error('Installed version differs from lock: ' + name);
  const texts = metadata ? await licenseFiles(directory) : [];
  const evidence = [];
  for (const relative of texts) {
    const target = path.join(directory, relative);
    const info = await lstat(target);
    if (!info.isFile() || info.size > 2 * 1024 ** 2) throw new Error('Invalid license evidence file.');
    const content = await readFile(target);
    if (content.includes(0)) throw new Error('Binary license evidence requires separate review.');
    evidence.push({ file: relative, sha256: createHash('sha256').update(content).digest('hex') });
    notices.push(`\n===== ${name}@${entry.version} :: ${relative} =====\n${content.toString('utf8')}\n`);
  }
  const declaredLicense = entry.license || metadata?.license || null;
  inventory.push({ location, name, version: entry.version, development: !!entry.dev, optional: !!entry.optional, installed: !!metadata, declaredLicense, licenseEvidence: evidence, reviewRequired: true });
  const component = { type: 'library', 'bom-ref': location, name, version: entry.version, purl: `pkg:npm/${name.replace('@', '%40')}@${entry.version}`, scope: entry.dev ? 'excluded' : entry.optional ? 'optional' : 'required', externalReferences: [{ type: 'distribution', url: entry.resolved }] };
  if (/^sha512-[A-Za-z0-9+/=]+$/.test(entry.integrity)) component.hashes = [{ alg: 'SHA-512', content: Buffer.from(entry.integrity.slice(7), 'base64').toString('hex') }];
  if (typeof declaredLicense === 'string' && !declaredLicense.startsWith('SEE LICENSE')) component.licenses = [{ expression: declaredLicense }];
  components.push(component);
}
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'inventory.json'), JSON.stringify({ purpose: 'All lockfile entries, including development and non-Windows optional entries. Not the final binary inventory.', limitations: ['Node runtime and WebView2 SDK/runtime are not included.', 'Missing optional package license texts must be obtained for any target distribution that includes them.', 'License metadata/evidence collection is not license compatibility approval.'], packages: inventory }, null, 2));
await writeFile(path.join(output, 'source-lock.cdx.json'), JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, metadata: { component: { type: 'application', name: 'PanoKopru source-lock inventory', version: lock.version }, properties: [{ name: 'panokopru:scope', value: 'source-lock-not-windows-distribution' }] }, components }, null, 2));
await writeFile(path.join(output, 'COLLECTED-LICENSE-TEXTS.txt'), 'Collected evidence only. Human distribution review and runtime/SDK notices are still required.\n' + notices.join(''));
console.log(`Dependency review generated: ${inventory.length} lock entries, ${inventory.filter(x => x.installed).length} installed packages, ${notices.length} license/notice files. No release approval implied.`);
