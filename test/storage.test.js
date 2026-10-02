import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createStorage, cleanStaging } from '../src/storage.js';
import { createHistory } from '../src/history.js';
import { createDiagnostics } from '../src/diagnostics.js';
import { UploadStorage } from '../src/uploads.js';
import { Readable } from 'node:stream';
import { publicError } from '../src/errors.js';
async function fixture(t) { const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-storage-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
test('inbox retention is opt-in, confirmed, favorite-aware, and never removes unmanaged originals', async t => {
  const root = await fixture(t); const history = await createHistory(root); let now = 1000000000000;
  const storage = await createStorage(root, history, { now: () => now });
  const paths = [];
  for (let i = 1; i <= 3; i++) { const directory = path.join(root, 'inbox', i + '-1234abcd'); await mkdir(directory, { recursive: true }); const file = path.join(directory, 'demo.pdf'); await writeFile(file, 'synthetic'); paths.push(file); }
  for (const file of paths.slice(0,2)) await storage.register(file);
  const id = await history.record({ type: 'file', path: paths[1], filename: 'demo.pdf' }, 'inbound'); await history.favorite(id);
  now += 40 * 86400000;
  assert.equal((await storage.cleanup({ confirmed: true })).removed, 0);
  await storage.policy(30); await assert.rejects(storage.cleanup(), { statusCode: 400 });
  assert.equal((await storage.cleanup({ confirmed: true })).removed, 1);
  assert.equal(await stat(paths[0]).catch(() => null), null);
  for (const file of paths.slice(1)) assert.equal(await readFile(file, 'utf8'), 'synthetic');
  const summary = await storage.summary(); assert.ok(summary.totalBytes >= summary.inbox); assert.equal(summary.retentionDays, 30);
  await assert.rejects(storage.register(path.join(root, 'other.pdf')), /managed file/);
});
test('startup staging cleanup only removes old matching owned upload directories', async t => {
  const root = await fixture(t); const storage = new UploadStorage(undefined, { stagingRoot: root, instanceId: 'test-instance' });
  await storage.consume(Readable.from([Buffer.alloc(2 * 1024 * 1024)]));
  assert.equal((await cleanStaging(root, 'test-instance')).removed, 0);
  assert.equal((await cleanStaging(root, 'other-instance', { now: Date.now() + 2 * 86400000 })).removed, 0);
  const foreign = path.join(root, 'upload-AAAAAA'); await mkdir(foreign); await writeFile(path.join(foreign, 'payload'), 'unmanaged');
  assert.equal((await cleanStaging(root, 'test-instance', { now: Date.now() + 2 * 86400000 })).removed, 1);
  assert.deepEqual(await readdir(root), ['upload-AAAAAA']);
});
test('diagnostics whitelist never persists body, filenames, authorization or arbitrary MIME strings', async t => {
  const root = await fixture(t); const diagnostics = await createDiagnostics(root);
  diagnostics.record({ stage: 'completed', bytes: 123, startedAt: '2026-10-02T12:00:00.000Z', authorization: 'private-secret', content: 'private-secret', filename: 'private-secret', requestMime: 'private-secret' });
  await diagnostics.flush(); const data = await readFile(path.join(root, 'transfer-diagnostics.json'), 'utf8');
  assert.ok(!data.includes('private-secret')); assert.equal(diagnostics.list()[0].bytes, 123);
});
test('public errors distinguish disk, connectivity, certificate, size and instance errors without native messages', () => {
  for (const [code, expected] of [['ENOSPC','disk_full'], ['ECONNREFUSED','connection_unavailable'], ['ERR_TLS_CERT_ALTNAME_INVALID','certificate_identity_mismatch'], ['ERR_INSTANCE_LOCKED','instance_locked']]) {
    assert.equal(publicError({ code, message: 'private path or secret' }).code, expected);
  }
  assert.deepEqual(publicError({ statusCode: 413 }), { status: 413, code: 'size_limit_exceeded' });
});
