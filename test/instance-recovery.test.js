import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir, rmdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { resolveRuntime, prepareRuntime, acquireInstance, recoverStaleInstance } from '../src/runtime-context.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-crash-recovery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = resolveRuntime({ env: { LOCALAPPDATA: path.join(root, 'profile'), CLIPBRIDGE_MODE: 'test',
    CLIPBRIDGE_DATA_ROOT: path.join(root, 'data'), CLIPBRIDGE_API_PORT: '47145', CLIPBRIDGE_DESKTOP_PORT: '47146', CLIPBRIDGE_LOCAL_PORT: '47147' } });
  await prepareRuntime(context);
  const file = path.join(context.dataRoot, 'instance.lock');
  return { context, file, save: async pid => {
    const record = { id: randomUUID(), pid, instanceId: context.instanceId, startedAt: new Date().toISOString() };
    await writeFile(file, JSON.stringify(record)); return record;
  } };
}

test('explicit crash recovery removes only a matching lock belonging to an exited synthetic child', async t => {
  const { context, file, save } = await fixture(t);
  const child = spawn(process.execPath, ['-e', 'process.exit(0)'], { windowsHide: true, stdio: 'ignore' });
  const pid = child.pid; await once(child, 'exit');
  await save(pid);
  await assert.rejects(acquireInstance(context), { code: 'ERR_INSTANCE_LOCKED' });
  await assert.rejects(recoverStaleInstance(context), { code: 'ERR_INSTANCE_LOCKED' });
  assert.equal(JSON.parse(await readFile(file)).pid, pid);
  assert.deepEqual(await recoverStaleInstance(context, { confirmed: true }), { recovered: true, dataRestored: false });
  assert.deepEqual(await recoverStaleInstance(context, { confirmed: true }), { recovered: false });
  const release = await acquireInstance(context); await release();
});

test('living or reused PID is never recovered, regardless of old lock age', async t => {
  const { context, file, save } = await fixture(t);
  const record = await save(process.pid); record.startedAt = '2000-01-01T00:00:00.000Z';
  await writeFile(file, JSON.stringify(record));
  await assert.rejects(recoverStaleInstance(context, { confirmed: true }), { code: 'ERR_INSTANCE_LOCKED' });
  assert.deepEqual(JSON.parse(await readFile(file)), record);
});

test('malformed, foreign, changed identity and critical-section guard are retained for review', async t => {
  const { context, file, save } = await fixture(t);
  const record = await save(process.pid);
  for (const raw of ['not-json', JSON.stringify({ ...record, instanceId: 'foreign' }), JSON.stringify({ ...record, pid: -1 })]) {
    await writeFile(file, raw);
    await assert.rejects(recoverStaleInstance(context, { confirmed: true }), { code: 'ERR_INSTANCE_LOCKED' });
    assert.equal(await readFile(file, 'utf8'), raw);
  }
  const guard = path.join(context.dataRoot, 'instance.guard'); await mkdir(guard);
  await assert.rejects(recoverStaleInstance(context, { confirmed: true }), { code: 'ERR_INSTANCE_LOCKED' });
  await assert.rejects(acquireInstance(context), { code: 'ERR_INSTANCE_LOCKED' }); await rmdir(guard);
  await writeFile(path.join(context.dataRoot, 'runtime-context.json'), JSON.stringify({ ...context, instanceId: 'foreign' }));
  await assert.rejects(recoverStaleInstance(context, { confirmed: true }), { code: 'ERR_INSTANCE_LOCKED' });
});

test('concurrent acquisition admits one owner and does not delete a replacement lock on release', async t => {
  const { context, file, save } = await fixture(t);
  const results = await Promise.allSettled([acquireInstance(context), acquireInstance(context)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const release = results.find(result => result.status === 'fulfilled').value;
  const replacement = await save(process.pid);
  await assert.rejects(release, /ownership changed/);
  assert.deepEqual(JSON.parse(await readFile(file)), replacement);
});
