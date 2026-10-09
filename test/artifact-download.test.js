import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { downloadArtifact, validateArtifact } from '../src/artifact-download.js';
const body = Buffer.from('synthetic binary');
const artifact = { url: 'https://nodejs.org/dist/example.zip', file: 'example.zip', maxBytes: 32, algorithm: 'sha256', encoding: 'hex', integrity: createHash('sha256').update(body).digest('hex') };
async function fixture(t) { const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-download-')); t.after(() => rm(root, { recursive: true, force: true })); return root; }
test('pinned downloader verifies fresh and cached bytes without another network call', async t => {
  const root = await fixture(t); let calls = 0;
  const fetcher = async (url, options) => { calls++; assert.equal(url, artifact.url); assert.equal(options.redirect, 'error'); return new Response(body); };
  const first = await downloadArtifact(artifact, root, { fetcher });
  assert.equal(first.cached, false); assert.equal(first.bytes, body.length);
  assert.equal((await downloadArtifact(artifact, root, { fetcher })).cached, true); assert.equal(calls, 1);
  assert.deepEqual(await readFile(first.file), body); assert.deepEqual(await readdir(root), ['example.zip']);
});
test('artifact policy rejects insecure origins, credentials, traversal and missing pins', () => {
  for (const patch of [{ url: 'http://nodejs.org/a' }, { url: 'https://foreign.invalid/a' }, { url: 'https://user:password@nodejs.org/a' }, { file: '../a' }, { integrity: '' }, { maxBytes: Infinity }]) assert.throws(() => validateArtifact({ ...artifact, ...patch }));
});
test('HTTP error, excessive declared/streamed size and checksum mismatch leave no payload', async t => {
  const root = await fixture(t);
  for (const response of [new Response('error', { status: 403 }), new Response(body, { headers: { 'content-length': '100' } }), new Response(Buffer.alloc(33)), new Response('wrong')]) {
    await assert.rejects(downloadArtifact(artifact, root, { fetcher: async () => response }));
    assert.deepEqual(await readdir(root), []);
  }
});
test('tampered cache is not overwritten or silently trusted', async t => {
  const root = await fixture(t); await writeFile(path.join(root, artifact.file), 'changed');
  await assert.rejects(downloadArtifact(artifact, root, { fetcher: () => assert.fail('No replacement download') }), { code: 'ERR_ARTIFACT_INTEGRITY' });
  assert.equal(await readFile(path.join(root, artifact.file), 'utf8'), 'changed');
});
test('broken streaming download removes only its own partial file', async t => {
  const root = await fixture(t); await writeFile(path.join(root, 'keep.txt'), 'keep');
  const stream = new ReadableStream({ start(controller) { controller.enqueue(body); controller.error(new Error('network interrupted')); } });
  await assert.rejects(downloadArtifact(artifact, root, { fetcher: async () => new Response(stream) }));
  assert.deepEqual(await readdir(root), ['keep.txt']);
});
test('concurrent publication cannot clobber the winning verified artifact', async t => {
  const root = await fixture(t); let count = 0, release; const ready = new Promise(resolve => { release = resolve; });
  const fetcher = async () => { if (++count === 2) release(); await ready; return new Response(body); };
  const results = await Promise.allSettled([downloadArtifact(artifact, root, { fetcher }), downloadArtifact(artifact, root, { fetcher })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.deepEqual(await readdir(root), ['example.zip']); assert.deepEqual(await readFile(path.join(root, artifact.file)), body);
});
test('linked artifact directory is rejected before any download', async t => {
  const root = await fixture(t), link = path.join(root, 'link'); await symlink(root, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(downloadArtifact(artifact, link, { fetcher: () => assert.fail('No network call') }));
});
