// File-only private acceptance ZIP; never executes the installer or its payload.
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { archiveFiles, verifySourceCompanion, scanPrivateFile } from './distribution-layout.js';
import { verifyRelease } from '../src/release-store.js';
import { hashFile, packageFiles } from '../src/package-files.js';
import { assertNoLinks, within } from '../src/runtime-context.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const work = process.argv[2] && path.resolve(process.argv[2]);
if (!work || !within(path.join(root, 'build'), work) || !/^candidate-[a-f0-9-]{36}$/.test(path.basename(work))) throw new Error('Explicit owned candidate required.');
await assertNoLinks(work);
const candidate = JSON.parse(await readFile(path.join(work, 'candidate-evidence.json'), 'utf8'));
const setup = JSON.parse(await readFile(path.join(work, 'setup-build-evidence.json'), 'utf8'));
if (!['installable-private-acceptance', 'installable-experimental-release'].includes(candidate.purpose) || setup.purpose !== candidate.purpose || setup.commit !== candidate.commit || setup.payloadManifestHash !== candidate.hash || setup.executableSHA256 !== await hashFile(path.join(work, 'ClipBridgeSetup.exe'))) throw new Error('Mismatched installable package.');
if (!setup.standalone || setup.embeddedPayload?.sha256 !== await hashFile(path.join(work,'embedded-payload.zip'))) throw new Error('Verified embedded installer required.');
const resourceReview = JSON.parse(await readFile(path.join(work,'embedded-resource-review.json'),'utf8'));
if (!resourceReview.passed || !resourceReview.standalone || resourceReview.commit !== candidate.commit ||
    resourceReview.executableSHA256 !== setup.executableSHA256 || resourceReview.manifestSHA256 !== candidate.hash ||
    resourceReview.payloadArchiveSHA256 !== setup.embeddedPayload.sha256) throw new Error('Embedded resource review required.');
const manifest = await verifyRelease(path.join(work, 'payload'), candidate.hash);
const companion = await verifySourceCompanion(work, candidate, manifest);
const payloadNames = await packageFiles(path.join(work, 'payload')).then(files => files.map(name => 'payload/' + name));
if (payloadNames.some(name => /^payload\/(source\/|sources\/|review\/|build-evidence\.json|toolchain-evidence\.json)/.test(name))) throw new Error('Engineering inputs must remain outside the user payload.');
const names = ['ClipBridgeSetup.exe'];
const entries = [
  ...names.map(name => ({ name, file: path.join(work, name) })),
  ...[['READ-ME-FIRST.md','INSTALL.md'], ['READ-ME-FIRST.tr.md','INSTALL.tr.md']].map(([name, guide]) => ({ name, file: path.join(work, 'source-snapshot/docs', guide) }))
];
// Local private-term scan covers final text AND binary entries. It is not a
// complete secret/license/visual audit and cannot approve public distribution.
let terms = [];
try { terms = JSON.parse(await readFile(path.join(root, '.local/privacy-terms.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const entry of [...entries, ...payloadNames.map(name => ({file:path.join(work,name)})), { file: path.join(work, companion.file) }]) {
  await scanPrivateFile(entry.file, terms);
}
const experimental = candidate.purpose === 'installable-experimental-release';
const name = `ClipBridge-${manifest.version}-win-x64-${experimental ? 'experimental' : 'test'}.zip`, target = path.join(work, name);
await assertNoLinks(target);
const { sha256 } = await archiveFiles(target, entries);
await writeFile(path.join(work, name + '.sha256'), sha256 + '  ' + name + '\n', { flag: 'wx' });
await writeFile(path.join(work, 'SHA256SUMS.txt'), [sha256 + '  ' + name, companion.sha256 + '  ' + companion.file, setup.executableSHA256 + '  ClipBridgeSetup.exe', candidate.hash + '  payload/release.json'].join('\n') + '\n', { flag: 'wx' });
await writeFile(path.join(work, 'archive-evidence.json'), JSON.stringify({ commit: candidate.commit, version: manifest.version, file: name, sha256, entries: entries.length, standalone: true, executableSHA256: setup.executableSHA256, sourceCompanion: companion, privateTermsApplied: terms.length > 0, approvedForPublication: false, acceptance: 'pending' }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ file: path.relative(root, target), sha256, version: manifest.version, commit: candidate.commit, experimental, privateAcceptanceOnly: !experimental }));
