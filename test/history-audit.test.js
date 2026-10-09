import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { documentationImagePolicy, historicalDocumentationImagePolicy, matchesDocumentationImage } from '../scripts/documentation-images.js';
import { inspectHistoryContent, inspectHistoryPath, auditReachableHistory } from '../scripts/check-history.js';
const run = promisify(execFile);

test('documentation image exceptions reject tampering, sensitive paths and PNG metadata', async () => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const pin = buffer => ({ path: 'docs/images/demo.png', sha256: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length, width: 1, height: 1 });
  const entry = pin(png);
  const policy = documentationImagePolicy({ files: [entry.path], documentationImages: [entry] });
  assert.equal(matchesDocumentationImage(png, policy.get(entry.path)), true);
  const changed = Buffer.from(png); changed[changed.length - 1] ^= 1;
  assert.equal(matchesDocumentationImage(changed, entry), false);
  assert.throws(() => documentationImagePolicy({ files: ['private.png'], documentationImages: [{ ...entry, path: 'private.png' }] }));
  assert.deepEqual(inspectHistoryPath(entry.path, '100644', new Set([entry.path]), policy), []);
  assert.ok(inspectHistoryPath('docs/images/unreviewed.png', '100644', new Set(['docs/images/unreviewed.png']), policy).length);
  const chunk = Buffer.alloc(16); chunk.writeUInt32BE(4); chunk.write('tEXt', 4); chunk.write('demo', 8);
  const metadataPng = Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)]);
  assert.equal(matchesDocumentationImage(metadataPng, pin(metadataPng)), false, 'A valid pin cannot admit textual metadata');
});

test('history audit admits reviewed PNG bytes but rejects an unreviewed earlier image version', { timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-doc-history-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = args => run('git', ['-c', 'core.hooksPath=NUL', ...args], { cwd: root, windowsHide: true });
  await git(['init', '--quiet']);
  // Use an approved documentation path in a temporary repository only.
  const { mkdir } = await import('node:fs/promises');
  await mkdir(path.join(root, 'docs', 'images'), { recursive: true });
  const imagePath = 'docs/images/demo.png';
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const entry = { path: imagePath, sha256: createHash('sha256').update(png).digest('hex'), bytes: png.length, width: 1, height: 1 };
  const documentationImages = documentationImagePolicy({ files: [imagePath], documentationImages: [entry] });
  const allowed = new Set([imagePath]);
  const commit = message => git(['-c', 'user.name=Synthetic Review', '-c', 'user.email=review@example.invalid', 'commit', '--quiet', '-m', message]);
  await writeFile(path.join(root, imagePath), png); await git(['add', imagePath]); await commit('Reviewed synthetic image');
  const approved = await auditReachableHistory({ repository: root, allowed, documentationImages });
  assert.equal(approved.passed, true); assert.equal(approved.reviewedImages, 1);
  const unreviewed = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#000000' } }).png().toBuffer();
  await writeFile(path.join(root, imagePath), unreviewed); await git(['add', imagePath]); await commit('Unreviewed synthetic change');
  const changed = await auditReachableHistory({ repository: root, allowed, documentationImages });
  assert.equal(changed.passed, false);
  assert.ok(changed.findings.some(item => item.code === 'binary_or_invalid_utf8_requires_review'));
  const previous = { ...entry, sha256: createHash('sha256').update(unreviewed).digest('hex'), bytes: unreviewed.length };
  const historicalDocumentationImages = historicalDocumentationImagePolicy({ files: [imagePath], historicalDocumentationImages: [previous] });
  assert.equal((await auditReachableHistory({ repository: root, allowed, documentationImages, historicalDocumentationImages })).passed, true);
  assert.throws(() => historicalDocumentationImagePolicy({ files: [imagePath], historicalDocumentationImages: [{ ...previous, path: 'private.png' }] }));
});

test('history gate reports only categories for private text, binary and removed/unapproved paths', () => {
  for (const [value, category] of [
    ['Bearer ' + 'a'.repeat(40), 'potential_access_key'],
    [['C:', 'Users', 'synthetic', 'file'].join('\\'), 'personal_absolute_path'],
    ['https://' + 'synthetic.example.ts.net', 'personal_tailnet_address'],
    ['-----BEGIN ' + 'PRIVATE KEY-----', 'private_key'],
  ]) assert.ok(inspectHistoryContent(Buffer.from(value)).includes(category));
  assert.deepEqual(inspectHistoryContent(Buffer.from('synthetic-term'), ['synthetic-term']), ['private_local_term']);
  assert.ok(inspectHistoryContent(Buffer.from([0, 255])).includes('binary_or_invalid_utf8_requires_review'));
  assert.deepEqual(inspectHistoryPath('safe.js', '100644', new Set(['safe.js'])), []);
  assert.ok(inspectHistoryPath('removed.txt', '100644', new Set()).length);
  assert.ok(inspectHistoryPath('safe.js', '120000', new Set(['safe.js'])).length);
});

test('history gate detects a secret in a prior commit even after the latest file is clean', { timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-history-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = args => run('git', ['-c', 'core.hooksPath=NUL', ...args], { cwd: root, windowsHide: true });
  await git(['init', '--quiet']);
  const commit = message => git(['-c', 'user.name=Synthetic Review', '-c', 'user.email=review@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', message]);
  await writeFile(path.join(root, 'fixture.txt'), 'Bearer ' + 'a'.repeat(40)); await git(['add', 'fixture.txt']); await commit('Synthetic old fixture');
  await writeFile(path.join(root, 'fixture.txt'), 'clean synthetic fixture'); await git(['add', 'fixture.txt']); await commit('Synthetic cleanup');
  const before = (await git(['status', '--porcelain'])).stdout;
  const report = await auditReachableHistory({ repository: root, allowed: new Set(['fixture.txt']) });
  assert.equal(report.commits, 2); assert.equal(report.passed, false);
  assert.ok(report.findings.some(item => item.code === 'potential_access_key'));
  assert.ok(!JSON.stringify(report).includes('a'.repeat(40)));
  assert.equal((await git(['status', '--porcelain'])).stdout, before);
});
