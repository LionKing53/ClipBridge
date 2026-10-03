import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { attachSupervisorControl } from '../src/supervisor-control.js';
const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const tick = () => new Promise(resolve => setImmediate(resolve));

test('inherited pipe accepts fragmented stop request and waits for one cleanup', async () => {
  const input = new PassThrough(); let calls = 0, finish;
  const done = new Promise(resolve => { finish = resolve; });
  const control = attachSupervisorControl(input, async () => { calls++; await done; });
  input.write('shut'); await tick(); assert.equal(calls, 0);
  input.write('down\r\n'); await tick(); assert.equal(calls, 1);
  const first = control.request(), second = control.request(); assert.equal(first, second);
  input.emit('error', new Error('late synthetic pipe failure'));
  assert.equal(input.destroyed, false); finish(); await first;
  assert.equal(input.destroyed, true); assert.equal(calls, 1);
});
test('EOF, pipe failure, malformed and excessive parent input all stop once without interpreting it', async () => {
  for (const action of [input => input.end(), input => input.emit('error', new Error('synthetic')), input => input.write('arbitrary command\n'), input => input.write(Buffer.alloc(10000))]) {
    const input = new PassThrough(); let calls = 0;
    const control = attachSupervisorControl(input, async () => { calls++; });
    action(input); await tick(); await control.request(); assert.equal(calls, 1); assert.equal(input.destroyed, true);
  }
});
test('shutdown errors are sanitized and the control pipe is released', async () => {
  const input = new PassThrough(), errors = [];
  const control = attachSupervisorControl(input, async () => { throw new Error('private path or body'); }, { onError: code => errors.push(code) });
  await control.request(); assert.deepEqual(errors, ['shutdown_failed']); assert.equal(input.destroyed, true);
});
test('already closed parent pipe immediately requests cleanup', async () => {
  const input = new PassThrough(); input.destroy(); let calls = 0;
  const control = attachSupervisorControl(input, async () => { calls++; });
  await control.request(); assert.equal(calls, 1);
});
test('synthetic Node child exits naturally after parent closes inherited stdin', async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-supervisor-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, 'result.txt');
  const child = spawn(process.execPath, [path.join(root, 'test/support/supervisor-child.js'), output], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill(); }); // Only this synthetic owned test child.
  const exited = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolve({ code, signal })); });
  child.stdin.end(); assert.deepEqual(await exited, { code: 0, signal: null });
  assert.equal(await readFile(output, 'utf8'), 'synthetic shutdown completed');
});
test('compiled owned-process probe gracefully stops only its synthetic Node child', { skip: process.platform !== 'win32', timeout: 15000 }, async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-owned-process-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const binary = path.join(temporary, 'OwnedNodeProbe.exe'), output = path.join(temporary, 'result.txt');
  const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { windowsHide: true, stdio: 'ignore' });
  const unrelatedExit = new Promise(resolve => unrelated.once('exit', resolve));
  t.after(async () => { if (unrelated.exitCode === null) unrelated.kill(); await unrelatedExit; });
  await run(path.join(process.env.SystemRoot, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:exe', '/out:' + binary,
    path.join(root, 'launcher/OwnedNode.cs'), path.join(root, 'test/support/OwnedNodeProbe.cs')], { windowsHide: true });
  const result = await run(binary, [process.execPath, path.join(root, 'test/support/supervisor-child.js'), output], { windowsHide: true, timeout: 10000 });
  assert.equal(result.stdout.trim(), 'owned child stopped');
  assert.equal(unrelated.exitCode, null, 'Another synthetic Node process is not targeted');
  assert.equal(await readFile(output, 'utf8'), 'synthetic shutdown completed');
});
