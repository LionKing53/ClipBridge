import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { copyApprovedFiles, sealCandidate } from '../src/package-files.js';
import { verifyRelease } from '../src/release-store.js';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-package-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source'), destination = path.join(root, 'candidate');
  await mkdir(source); return { root, source, destination };
}
test('package copies only approved inputs, retains guard and seals exact file bytes', async t => {
  const { source, destination } = await fixture(t);
  await writeFile(path.join(source, 'SOURCE-CHECKOUT'), 'blocked');
  await writeFile(path.join(source, 'secret.txt'), 'must stay outside');
  await copyApprovedFiles(source, destination, ['SOURCE-CHECKOUT']);
  const result = await sealCandidate(destination, { version: '1.0.0-preview.1', commit: '1'.repeat(40) });
  assert.equal(result.files, 1); assert.equal(result.bytes, 7);
  assert.equal((await verifyRelease(destination, result.hash)).files[0].path, 'SOURCE-CHECKOUT');
  await assert.rejects(readFile(path.join(destination, 'secret.txt')), { code: 'ENOENT' });
  await writeFile(path.join(destination, 'SOURCE-CHECKOUT'), 'changed');
  await assert.rejects(verifyRelease(destination, result.hash));
});
test('package refuses traversal, private directories, duplicate names and overlapping roots', async t => {
  const { source, destination } = await fixture(t);
  for (const files of [['../secret'], ['.local/key.txt'], ['inbox/a.txt'], ['a', 'A'], ['CON.txt']]) {
    await assert.rejects(copyApprovedFiles(source, destination, files));
  }
  await assert.rejects(copyApprovedFiles(source, source, ['file.txt']));
  await assert.rejects(copyApprovedFiles(source, path.join(source, 'build'), ['build/file.txt']));
  await assert.rejects(readFile(path.join(destination, 'release.json')), { code: 'ENOENT' });
});
test('package refuses linked input ancestors and will not overwrite existing files', async t => {
  const { root, source, destination } = await fixture(t);
  await writeFile(path.join(source, 'demo.txt'), 'synthetic');
  const link = path.join(root, 'linked');
  await symlink(source, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(copyApprovedFiles(link, destination, ['demo.txt']));
  await copyApprovedFiles(source, destination, ['demo.txt']);
  await writeFile(path.join(destination, 'demo.txt'), 'preserve');
  await assert.rejects(copyApprovedFiles(source, destination, ['demo.txt']), { code: 'EEXIST' });
  assert.equal(await readFile(path.join(destination, 'demo.txt'), 'utf8'), 'preserve');
});
test('sealing rejects private extras, links and a preexisting release manifest', async t => {
  const { source } = await fixture(t);
  await writeFile(path.join(source, 'sample.key'), 'synthetic');
  await assert.rejects(sealCandidate(source, { version: '1.0.0', commit: '1'.repeat(40) }));
  await rm(path.join(source, 'sample.key'));
  await writeFile(path.join(source, 'release.json'), '{}');
  await assert.rejects(sealCandidate(source, { version: '1.0.0', commit: '1'.repeat(40) }));
});
