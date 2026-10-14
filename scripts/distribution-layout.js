// File-only distribution primitives; never execute runtime or OS adapters.
import path from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { ZipArchive } from 'archiver';
import { hashFile, packageFiles } from '../src/package-files.js';
import { validateReleaseManifest } from '../src/release-store.js';
import { assertNoLinks } from '../src/runtime-context.js';

export async function scanPrivateFile(file, terms) {
  await assertNoLinks(file);
  const needles = terms.map(term => term.toLowerCase());
  const overlap = Math.max(1024, ...needles.map(term => Buffer.byteLength(term, 'utf8') * 4 + 2));
  let tail = Buffer.alloc(0), offset = 0;
  for await (const block of createReadStream(file, { highWaterMark: 1024 * 1024 })) {
    const window = Buffer.concat([tail, block]);
    const start = offset - tail.length;
    const text = window.toString('utf8').toLowerCase();
    const wide = window.subarray(start % 2).toString('utf16le').toLowerCase();
    if (needles.some(term => text.includes(term) || wide.includes(term))) throw new Error('Private-term match in package; no archive produced.');
    offset += block.length;
    tail = window.subarray(Math.max(0, window.length - overlap));
  }
}

export async function archiveFiles(target, entries) {
  // Apply the same Windows-safe, case-insensitive path policy as the installer.
  validateReleaseManifest({ format: 1, version: '0.0.0', commit: '0'.repeat(40), schemaMin: 1, schemaMax: 1,
    files: entries.map(({ name }) => ({ path: name, bytes: 0, sha256: '0'.repeat(64) })) });
  await assertNoLinks(target);
  for (const entry of entries) { await assertNoLinks(entry.file); await hashFile(entry.file); }
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const output = createWriteStream(target, { flags: 'wx' });
  const complete = once(output, 'close');
  archive.on('error', error => output.destroy(error));
  archive.pipe(output);
  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name)))
    archive.file(entry.file, { name: entry.name, date: new Date('2000-01-01T00:00:00Z') });
  // Attach both rejection handlers immediately, including an existing-output
  // error from the stream; never leave a rejected close promise unobserved.
  await Promise.all([archive.finalize(), complete]);
  return { sha256: await hashFile(target), entries: entries.length };
}

export async function createSourceCompanion({ work, snapshot, version, commit, nativeDirectory, nativeName, nativeEvidence }) {
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version) || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid source identity.');
  if (!nativeDirectory || nativeName !== 'ClipBridge-sharp-0.35.5-sources.zip') throw new Error('Complete native source companion required.');
  const nativeFile = path.join(nativeDirectory, nativeName);
  const nativeSHA256 = await hashFile(nativeFile);
  if (nativeSHA256 !== nativeEvidence.sha256) throw new Error('Native source hash mismatch.');
  const names = await packageFiles(snapshot), files = [];
  for (const name of names) files.push({ path: name, sha256: await hashFile(path.join(snapshot, name)) });
  const descriptor = path.join(work, 'source-delivery.json');
  const record = { format: 1, version, commit, application: files, native: { file: 'native/' + nativeName, sha256: nativeSHA256 },
    rebuildGuide: 'application/docs/NATIVE-REBUILD.md', patches: 'Native archive recipe snapshots; application snapshot is the exact reviewed commit.',
    delivery: 'Publish the binary and this source companion together at the same download location, without additional charge. Upstream links are not a substitute.' };
  await writeFile(descriptor, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  const nativeDelivery = path.join(work, 'native-companion-input.json');
  await writeFile(nativeDelivery, JSON.stringify({ ...nativeEvidence, bundle: nativeName }, null, 2) + '\n', { flag: 'wx' });
  const file = `ClipBridge-${version}-sources.zip`;
  const archived = await archiveFiles(path.join(work, file), [
    ...names.map(name => ({ name: 'application/' + name, file: path.join(snapshot, name) })),
    { name: 'native/' + nativeName, file: nativeFile },
    { name: 'native/evidence.json', file: nativeDelivery },
    ...['inventory.json', 'NATIVE-NOTICES.txt'].map(name => ({ name: 'native/' + name, file: path.join(nativeDirectory, name) })),
    { name: 'source-delivery.json', file: descriptor }
  ]);
  return { format: 1, version, commit, file, ...archived, nativeSHA256,
    applicationFiles: names.length, publicationRequiresBothArchives: true };
}

export async function verifySourceCompanion(work, candidate, manifest) {
  const record = JSON.parse(await readFile(path.join(work, 'source-companion-evidence.json'), 'utf8'));
  const binding = JSON.parse(await readFile(path.join(work, 'payload/licenses/SOURCE-PACKAGE.json'), 'utf8'));
  const expected = `ClipBridge-${manifest.version}-sources.zip`;
  if (record.file !== expected || record.commit !== candidate.commit || record.version !== manifest.version ||
      binding.commit !== record.commit || binding.version !== record.version || binding.file !== record.file ||
      binding.sha256 !== record.sha256 || !record.publicationRequiresBothArchives ||
      record.sha256 !== await hashFile(path.join(work, expected))) throw new Error('Matching source companion is missing or changed.');
  return record;
}
