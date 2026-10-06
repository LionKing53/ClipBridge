import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { inspectHistoryContent, inspectHistoryPath, auditReachableHistory } from '../scripts/check-history.js';
const run = promisify(execFile);

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
