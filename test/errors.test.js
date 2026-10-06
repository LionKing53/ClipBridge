import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { PassThrough } from 'node:stream';
import { publicError, publicFailure, operationError } from '../src/errors.js';
import { checkPermissionResult } from '../src/network-manager.js';
import { createClipboardProcess } from '../src/clipboard-process.js';
import { createServer } from '../src/app.js';

test('public failures whitelist statuses and codes and never expose native messages', () => {
  for (const [code, expected] of [
    ['ERR_PERMISSION_CANCELLED', 'permission_cancelled'], ['ERR_PERMISSION_TIMEOUT', 'permission_timeout'],
    ['ERR_PERMISSION_FAILED', 'permission_failed'], ['ERR_NETWORK_CHANGED', 'network_changed'],
    ['ERR_CLIPBOARD_READ', 'clipboard_read_failed'], ['ERR_CLIPBOARD_WRITE', 'clipboard_write_failed'],
    ['ERR_CLIPBOARD_TIMEOUT', 'clipboard_timeout'], ['CERT_HAS_EXPIRED', 'certificate_expired'],
    ['SELF_SIGNED_CERT_IN_CHAIN', 'certificate_not_trusted'], ['ENOSPC', 'disk_full'],
    ['ECONNRESET', 'transfer_interrupted'], ['ERR_UNAUTHORIZED', 'unauthorized'],
  ]) {
    const failure = publicFailure({ code, message: 'sensitive-fixture', stderr: 'sensitive-fixture' });
    assert.equal(failure.body.error, expected); assert.ok(failure.body.message.length > 10);
    assert.ok(!JSON.stringify(failure).includes('sensitive-fixture'));
  }
  for (const code of ['toString', '__proto__', 'constructor', 'sensitive-fixture']) {
    assert.deepEqual(publicError({ code, statusCode: 999 }, 'sensitive-fixture'), { status: 500, code: 'operation_failed' });
  }
  assert.equal(publicFailure({ statusCode: 422, message: 'sensitive-fixture' }).body.error, 'invalid_content');
  assert.throws(() => operationError('arbitrary'), TypeError);
});

test('permission response distinguishes cancellation, partial failure and malformed output', () => {
  checkPermissionResult('\uFEFF{"ok":true}');
  assert.throws(() => checkPermissionResult('{"ok":false,"cancelled":true}'), { code: 'ERR_PERMISSION_CANCELLED' });
  for (const raw of ['{"ok":false}', 'null', 'invalid-sensitive-fixture', '{"ok":false,"cancelled":"true"}']) {
    assert.throws(() => checkPermissionResult(raw), { code: 'ERR_PERMISSION_FAILED' });
  }
});

function childFixture(options = {}) {
  const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough();
  let kills = 0;
  child.kill = () => { kills++; queueMicrotask(() => child.emit('close', null)); };
  const run = createClipboardProcess({ ...options, spawnChild: (exe, args, flags) => {
    assert.equal(exe, 'powershell.exe'); assert.equal(flags.windowsHide, true); assert.equal(flags.shell, false);
    assert.equal(flags.stdio[2], 'ignore'); assert.ok(!args.includes('sensitive-fixture'));
    return child;
  } });
  return { child, run, kills: () => kills };
}

test('clipboard child returns bounded output and safe read/write failures without touching the real clipboard', async () => {
  let f = childFixture(); let result = f.run('synthetic-script', 'sensitive-fixture');
  f.child.stdout.write('c3ludGhldGlj'); f.child.emit('close', 0);
  assert.equal(await result, 'c3ludGhldGlj'); assert.equal(f.kills(), 0);
  for (const operation of ['read', 'write']) {
    f = childFixture(); result = f.run('synthetic-script', '', { operation });
    f.child.emit('error', new Error('sensitive-fixture'));
    await assert.rejects(result, { code: operation === 'read' ? 'ERR_CLIPBOARD_READ' : 'ERR_CLIPBOARD_WRITE' });
    f.child.emit('close', -1);
  }
});

test('clipboard timeout, output overflow and broken stdin stop only the owned child', async () => {
  let f = childFixture({ timeoutMs: 5 });
  await assert.rejects(f.run('synthetic-script'), { code: 'ERR_CLIPBOARD_TIMEOUT' }); assert.equal(f.kills(), 1);
  f = childFixture({ maxOutputBytes: 3 }); let result = f.run('synthetic-script');
  f.child.stdout.write('1234'); await assert.rejects(result, { statusCode: 413 }); assert.equal(f.kills(), 1);
  f = childFixture(); result = f.run('synthetic-script');
  f.child.stdin.emit('error', new Error('sensitive-fixture'));
  await assert.rejects(result, { code: 'ERR_CLIPBOARD_WRITE' }); assert.equal(f.kills(), 1);
});

test('upload and download API errors are classified and never return raw adapter messages', async t => {
  let failure = operationError('ERR_CLIPBOARD_WRITE');
  const server = createServer({ token: 'synthetic-test-token',
    getClipboardItem: async () => { throw failure; }, setClipboardItem: async () => { throw failure; },
    logger: { error() {}, info() {} } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/v1/clipboard`;
  const headers = { Authorization: 'Bearer synthetic-test-token', 'Content-Type': 'application/json' };
  for (const method of ['GET', 'POST']) {
    const response = await fetch(url, { method, headers, ...(method === 'POST' ? { body: JSON.stringify({ type: 'text', content: 'synthetic' }) } : {}) });
    assert.equal(response.status, 503); assert.equal((await response.json()).error, 'clipboard_write_failed');
  }
  failure = Object.assign(new Error('sensitive-fixture'), { statusCode: 422 });
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ type: 'text', content: 'synthetic' }) });
  assert.equal(response.status, 422); const body = await response.json();
  assert.equal(body.error, 'invalid_content'); assert.ok(!JSON.stringify(body).includes('sensitive-fixture'));
});
