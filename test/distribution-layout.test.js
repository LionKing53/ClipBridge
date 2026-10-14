import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createSourceCompanion, verifySourceCompanion, archiveFiles } from '../scripts/distribution-layout.js';
import { hashFile, sealCandidate } from '../src/package-files.js';
import { verifyRelease } from '../src/release-store.js';

async function fixture(t) {
  const work = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-distribution-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const snapshot = path.join(work, 'source-snapshot'), nativeDirectory = path.join(work, 'native');
  await mkdir(snapshot); await mkdir(nativeDirectory);
  await writeFile(path.join(snapshot, 'SOURCE-CHECKOUT'), 'synthetic guard');
  await writeFile(path.join(snapshot, 'LICENSE'), 'synthetic license');
  const nativeName = 'ClipBridge-sharp-0.35.5-sources.zip';
  await writeFile(path.join(nativeDirectory, nativeName), 'synthetic native source bytes');
  await writeFile(path.join(nativeDirectory, 'inventory.json'), '{"synthetic":true}');
  await writeFile(path.join(nativeDirectory, 'NATIVE-NOTICES.txt'), 'synthetic original notices');
  return { work, snapshot, nativeDirectory, nativeName, version: '1.2.1', commit: 'a'.repeat(40),
    nativeEvidence: { sha256: await hashFile(path.join(nativeDirectory, nativeName)) } };
}

test('source companion binds exact source bytes and refuses missing or changed delivery', async t => {
  const f = await fixture(t), record = await createSourceCompanion(f);
  assert.equal(record.applicationFiles, 2);
  assert.equal(record.sha256, await hashFile(path.join(f.work, record.file)));
  const descriptor = JSON.parse(await readFile(path.join(f.work, 'source-delivery.json')));
  assert.equal(descriptor.application.find(item => item.path === 'SOURCE-CHECKOUT').sha256, await hashFile(path.join(f.snapshot, 'SOURCE-CHECKOUT')));
  const payload = path.join(f.work, 'payload'); await mkdir(path.join(payload, 'licenses'), { recursive: true });
  await writeFile(path.join(payload, 'licenses/SOURCE-PACKAGE.json'), JSON.stringify(record));
  await writeFile(path.join(f.work, 'source-companion-evidence.json'), JSON.stringify(record));
  const sealed = await sealCandidate(payload, f), manifest = await verifyRelease(payload, sealed.hash);
  assert.equal((await verifySourceCompanion(f.work, { commit: f.commit }, manifest)).sha256, record.sha256);
  await assert.rejects(verifySourceCompanion(f.work, { commit: 'b'.repeat(40) }, manifest), /Matching source/);
  await writeFile(path.join(payload, 'licenses/SOURCE-PACKAGE.json'), JSON.stringify({ ...record, sha256: '0'.repeat(64) }));
  await assert.rejects(verifyRelease(payload, sealed.hash), /integrity/);
  await assert.rejects(verifySourceCompanion(f.work, { commit: f.commit }, manifest), /Matching source/);
  await writeFile(path.join(payload, 'licenses/SOURCE-PACKAGE.json'), JSON.stringify(record));
  await writeFile(path.join(f.work, record.file), 'changed');
  await assert.rejects(verifySourceCompanion(f.work, { commit: f.commit }, manifest), /Matching source/);
  await rm(path.join(f.work, record.file));
  await assert.rejects(verifySourceCompanion(f.work, { commit: f.commit }, manifest));
});

test('source production rejects absent native sources and mismatched pinned archives', async t => {
  const f = await fixture(t);
  await assert.rejects(createSourceCompanion({ ...f, nativeDirectory: null }), /Complete native/);
  await assert.rejects(createSourceCompanion({ ...f, nativeEvidence: { sha256: '0'.repeat(64) } }), /Native source hash/);
});

test('archive writer rejects unsafe or Windows-duplicate names and preserves existing output', async t => {
  const f = await fixture(t), file = path.join(f.snapshot, 'LICENSE'), target = path.join(f.work, 'test.zip');
  for (const names of [['../escape'], ['CON.txt'], ['one', 'ONE']])
    await assert.rejects(archiveFiles(target, names.map(name => ({ name, file }))));
  await archiveFiles(target, [{ name: 'LICENSE', file }]);
  const before = await readFile(target);
  await assert.rejects(archiveFiles(target, [{ name: 'LICENSE', file }]));
  assert.deepEqual(await readFile(target), before);
});
