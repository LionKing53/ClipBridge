// File-only private acceptance ZIP; never executes the installer or its payload.
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
import { verifyRelease } from '../src/release-store.js';
import { hashFile, packageFiles } from '../src/package-files.js';
import { assertNoLinks, within } from '../src/runtime-context.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const work = process.argv[2] && path.resolve(process.argv[2]);
if (!work || !within(path.join(root, 'build'), work) || !/^candidate-[a-f0-9-]{36}$/.test(path.basename(work))) throw new Error('Explicit owned candidate required.');
await assertNoLinks(work);
const candidate = JSON.parse(await readFile(path.join(work, 'candidate-evidence.json'), 'utf8'));
const setup = JSON.parse(await readFile(path.join(work, 'setup-build-evidence.json'), 'utf8'));
if (candidate.purpose !== 'installable-private-acceptance' || setup.purpose !== candidate.purpose || setup.commit !== candidate.commit || setup.payloadManifestHash !== candidate.hash || setup.executableSHA256 !== await hashFile(path.join(work, 'ClipBridgeSetup.exe'))) throw new Error('Mismatched private test package.');
const manifest = await verifyRelease(path.join(work, 'payload'), candidate.hash);
const names = ['ClipBridgeSetup.exe', 'candidate-evidence.json', 'setup-build-evidence.json', ...await packageFiles(path.join(work, 'payload')).then(files => files.map(name => 'payload/' + name))];
// Local private-term scan covers final text AND binary entries. It is not a
// complete secret/license/visual audit and cannot approve public distribution.
let terms = [];
try { terms = JSON.parse(await readFile(path.join(root, '.local/privacy-terms.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const name of names) {
  const bytes = await readFile(path.join(work, name));
  if (terms.some(term => bytes.toString('utf8').toLowerCase().includes(term.toLowerCase()) || bytes.toString('utf16le').toLowerCase().includes(term.toLowerCase()))) throw new Error('Private-term match in package; no archive produced.');
}
const name = `ClipBridge-${manifest.version}-win-x64-test.zip`, target = path.join(work, name);
await assertNoLinks(target);
const archive = new ZipArchive({ zlib: { level: 9 } });
const output = createWriteStream(target, { flags: 'wx' });
const complete = once(output, 'close');
archive.on('error', error => output.destroy(error)); archive.pipe(output);
for (const name of names.sort()) archive.file(path.join(work, name), { name, date: new Date('2000-01-01T00:00:00Z') });
archive.file(path.join(work, 'payload/source/docs/QUICKSTART.md'), { name: 'READ-ME-FIRST.md', date: new Date('2000-01-01T00:00:00Z') });
await archive.finalize(); await complete;
const sha256 = await hashFile(target);
await writeFile(path.join(work, name + '.sha256'), sha256 + '  ' + name + '\n', { flag: 'wx' });
await writeFile(path.join(work, 'archive-evidence.json'), JSON.stringify({ commit: candidate.commit, version: manifest.version, file: name, sha256, entries: names.length+1, privateTermsApplied: terms.length > 0, approvedForPublication: false, acceptance: 'pending' }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file: path.relative(root, target), sha256, version: manifest.version, commit: candidate.commit, privateAcceptanceOnly: true }));
