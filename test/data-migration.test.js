import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { migrateLegacyData } from '../src/data-migration.js';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-migration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const from = path.join(root, 'old'); const to = path.join(root, 'new'); const backup = path.join(root, 'backup');
  await mkdir(path.join(from, 'history'), { recursive: true }); await mkdir(path.join(from, 'inbox'));
  await writeFile(path.join(from, 'config.json'), JSON.stringify({ token: 'synthetic-credential-'.repeat(3) }));
  await writeFile(path.join(from, 'inbox', 'demo.pdf'), '%PDF-synthetic');
  await writeFile(path.join(from, 'history', 'index.json'), JSON.stringify({ settings: { enabled: true, limit: 100 }, items: [{ favorite: true, source: path.join(from, 'inbox', 'demo.pdf') }, { source: path.join(root, 'external.pdf') }] }));
  return { root, from, to, backup, confirmedStopped: true, confirmedSameAccount: true, secureDirectory: async () => {} };
}
test('offline migration verifies backup and preserves token, favorites, external paths and original data', async t => {
  const f = await fixture(t); const result = await migrateLegacyData(f);
  assert.equal(result.backupVerified, true);
  assert.deepEqual(await readFile(path.join(f.to, 'config.json')), await readFile(path.join(f.from, 'config.json')));
  assert.deepEqual(await readFile(path.join(f.backup, 'history/index.json')), await readFile(path.join(f.from, 'history/index.json')));
  const index = JSON.parse(await readFile(path.join(f.to, 'history/index.json'), 'utf8'));
  assert.equal(index.items[0].favorite, true); assert.equal(index.items[0].source, path.join(f.to, 'inbox/demo.pdf'));
  assert.equal(index.items[1].source, path.join(f.root, 'external.pdf'));
  assert.equal(await readFile(path.join(f.from, 'inbox/demo.pdf'), 'utf8'), '%PDF-synthetic');
});
test('migration rejects missing consent, overlapping paths, active state and existing destination', async t => {
  const f = await fixture(t);
  await assert.rejects(migrateLegacyData({ ...f, confirmedStopped: false }));
  await assert.rejects(migrateLegacyData({ ...f, to: path.join(f.from, 'nested') }));
  await writeFile(path.join(f.from, 'instance.lock'), '{}');
  await assert.rejects(migrateLegacyData(f));
  await rm(path.join(f.from, 'instance.lock')); await mkdir(f.to);
  await assert.rejects(migrateLegacyData(f));
});
test('concurrent legacy writes prevent activation; verified backup and originals are retained', async t => {
  const f = await fixture(t);
  await assert.rejects(migrateLegacyData({ ...f, beforeCommit: () => writeFile(path.join(f.from, 'inbox/demo.pdf'), 'new transfer') }), /changed during migration/);
  assert.ok(!(await readdir(f.root)).includes('new'));
  assert.equal(await readFile(path.join(f.backup, 'inbox/demo.pdf'), 'utf8'), '%PDF-synthetic');
  assert.equal(await readFile(path.join(f.from, 'inbox/demo.pdf'), 'utf8'), 'new transfer');
});
