// File-only build primitives. No installation, application startup or private inputs.
import path from 'node:path';
import { createReadStream, constants } from 'node:fs';
import { mkdir, lstat, readdir, copyFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assertNoLinks, within } from './runtime-context.js';
import { validateReleaseManifest, verifyRelease } from './release-store.js';

const fail = () => new Error('Invalid candidate package input.');
export async function hashFile(file) {
  await assertNoLinks(file);
  if (!(await lstat(file)).isFile()) throw fail();
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function packageFiles(root, relative = '') {
  await assertNoLinks(root);
  const result = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw fail();
    if (entry.isDirectory()) result.push(...await packageFiles(root, name));
    else if (entry.isFile()) result.push(name);
    else throw fail();
  }
  return result.sort();
}
export async function copyApprovedFiles(source, destination, files) {
  if (!path.isAbsolute(source) || !path.isAbsolute(destination) || within(destination, source)) throw fail();
  // Reuse Windows-safe path and sensitive-directory policy BEFORE any copying.
  validateReleaseManifest({ format: 1, version: '0.0.0', commit: '0'.repeat(40), schemaMin: 1, schemaMax: 1,
    files: files.map(name => ({ path: name, bytes: 0, sha256: '0'.repeat(64) })) });
  await assertNoLinks(source); await assertNoLinks(destination);
  for (const name of files) {
    const from = path.join(source, name), to = path.join(destination, name);
    if (within(destination, from)) throw fail();
    await assertNoLinks(from); await assertNoLinks(to);
    if (!(await lstat(from)).isFile()) throw fail();
  }
  for (const name of files) {
    const to = path.join(destination, name);
    await mkdir(path.dirname(to), { recursive: true });
    await copyFile(path.join(source, name), to, constants.COPYFILE_EXCL);
  }
}
export async function sealCandidate(directory, { version, commit }) {
  const names = await packageFiles(directory);
  const files = [];
  for (const name of names) files.push({ path: name, bytes: (await lstat(path.join(directory, name))).size, sha256: await hashFile(path.join(directory, name)) });
  const manifest = validateReleaseManifest({ format: 1, version, commit, schemaMin: 1, schemaMax: 1, files });
  await writeFile(path.join(directory, 'release.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  const hash = await hashFile(path.join(directory, 'release.json'));
  await verifyRelease(directory, hash);
  return { hash, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) };
}
