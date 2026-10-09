import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, readFile, writeFile, readdir, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolveRuntime, sourceRoot } from '../src/runtime-context.js';
import { runInstallPreflight } from '../src/install-preflight.js';
import { createIsolatedWindowsInstallProbes, probeLoopbackPort } from '../src/windows-install-probes.js';
const run = promisify(execFile);
const hash = value => createHash('sha256').update(value).digest('hex');
const windows = { skip: process.platform !== 'win32', timeout: 60000 };
async function listen() {
  const server = net.createServer(socket => socket.destroy());
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server;
}
const close = server => new Promise(resolve => server.close(resolve));
async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-windows-preflight-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, 'scope'); await mkdir(root);
  const listeners = await Promise.all([listen(), listen(), listen()]);
  const ports = listeners.map(server => server.address().port);
  await Promise.all(listeners.map(close));
  const context = resolveRuntime({ env: { LOCALAPPDATA: path.join(temporary, 'profile'), CLIPBRIDGE_MODE: 'test', CLIPBRIDGE_DATA_ROOT: root,
    CLIPBRIDGE_API_PORT: String(ports[0]), CLIPBRIDGE_DESKTOP_PORT: String(ports[1]), CLIPBRIDGE_LOCAL_PORT: String(ports[2]) } });
  const candidateDirectory = path.join(root, 'candidate');
  await mkdir(path.join(candidateDirectory, 'runtime'), { recursive: true });
  return { root, ports, context, candidateDirectory };
}
function makeProbes(f) {
  return createIsolatedWindowsInstallProbes({ context: f.context, candidateDirectory: f.candidateDirectory, manifestHash: f.manifestHash || 'a'.repeat(64) });
}
test('loopback availability closes its socket and distinguishes a real occupied port', async t => {
  const server = await listen();
  t.after(() => close(server));
  assert.equal(await probeLoopbackPort(server.address().port), false);
  assert.equal(await probeLoopbackPort(0), true);
  const freePort = server.address().port;
  await close(server);
  assert.equal(await probeLoopbackPort(freePort), true);
  assert.equal(await probeLoopbackPort(freePort), true);
});
test('loopback cancellation before/during listen never leaks a bound port', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(probeLoopbackPort(0, { signal: controller.signal }));
  const source = await listen(), port = source.address().port; await close(source);
  const pending = new AbortController();
  const result = probeLoopbackPort(port, { signal: pending.signal }); pending.abort();
  await assert.rejects(result);
  assert.equal(await probeLoopbackPort(port), true);
});
test('Windows probe factory rejects forged/production contexts and unscoped paths or ports', windows, async t => {
  const f = await fixture(t);
  assert.throws(() => createIsolatedWindowsInstallProbes({ context: { ...f.context }, candidateDirectory: f.candidateDirectory, manifestHash: 'a'.repeat(64) }));
  const production = resolveRuntime({ checkout: false, env: { CLIPBRIDGE_MODE: 'production', LOCALAPPDATA: path.join(f.root, 'profile') } });
  assert.throws(() => createIsolatedWindowsInstallProbes({ context: production, candidateDirectory: f.candidateDirectory, manifestHash: 'a'.repeat(64) }));
  assert.throws(() => createIsolatedWindowsInstallProbes({ context: f.context, candidateDirectory: path.dirname(f.root), manifestHash: 'a'.repeat(64) }));
  const probes = makeProbes(f);
  await assert.rejects(probes.destination(path.join(path.dirname(f.root), 'outside')));
  await assert.rejects(probes.nodeRuntime(path.join(f.root, 'other.exe')));
  assert.throws(() => probes.port(32145));
});
test('Windows host and WebView2 observations are read-only with bounded, structured output', windows, async t => {
  const f = await fixture(t), probes = makeProbes(f);
  const host = await probes.host();
  assert.equal(host.platform, 'win32'); assert.ok(['x64', 'arm64', 'ia32', 'unknown'].includes(host.arch));
  assert.equal(typeof host.elevated, 'boolean');
  if (host.elevated) { t.diagnostic('Elevated context: only refusal was exercised.'); await assert.rejects(probes.webView2()); return; }
  const runtime = await probes.webView2();
  assert.equal(typeof runtime.complete, 'boolean'); assert.equal(runtime.versions.length, 2);
  assert.ok(runtime.versions.every(value => value === null || typeof value === 'string'));
  t.diagnostic('Non-elevated Runtime registry read completed; raw values omitted.');
  // Do not print live registry values in test output or put them in fixtures.
});
test('Windows destination reads real free space and access without creating target directories', windows, async t => {
  const f = await fixture(t), probes = makeProbes(f);
  if ((await probes.host()).elevated) { t.diagnostic('Elevated context: only refusal was exercised.'); await assert.rejects(probes.destination(path.join(f.root, 'program'))); return; }
  const before = await readdir(f.root);
  const a = await probes.destination(path.join(f.root, 'program'));
  const b = await probes.destination(path.join(f.root, 'future', 'data'));
  assert.equal(a.writable, true); assert.equal(b.writable, true);
  assert.ok(Number.isSafeInteger(a.freeBytes) && a.freeBytes >= 0);
  assert.equal(a.volumeId, b.volumeId);
  assert.deepEqual(await readdir(f.root), before);
  t.diagnostic('Native disk/access observations completed on temporary targets only.');
  await assert.rejects(probes.destination(f.candidateDirectory));
});
test('Windows probes reject junctions and return sanitized failures', windows, async t => {
  const f = await fixture(t), probes = makeProbes(f);
  const real = path.join(f.root, 'real'); await mkdir(real);
  const linked = path.join(f.root, 'linked'); await symlink(real, linked, 'junction');
  await assert.rejects(probes.destination(path.join(linked, 'program')));
  const invalid = path.join(f.root, 'invalid'); await writeFile(invalid, 'synthetic');
  await assert.rejects(probes.destination(path.join(invalid, 'child')), error => {
    assert.equal(error.message.includes(f.root), false); return true;
  });
});
test('Windows metadata inspection checks pinned synthetic PE bytes without executing candidate code', windows, async t => {
  const f = await fixture(t);
  const binary = path.join(f.candidateDirectory, 'runtime', 'node.exe');
  await run(path.join(process.env.SystemRoot, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    ['/nologo', '/target:exe', '/platform:x64', '/out:' + binary, path.join(sourceRoot, 'test', 'support', 'SyntheticNode.cs')], { windowsHide: true, timeout: 10000 });
  const bytes = await readFile(binary);
  const manifest = JSON.stringify({ format: 1, version: '1.0.0', commit: 'a'.repeat(40), schemaMin: 1, schemaMax: 1,
    files: [{ path: 'runtime/node.exe', bytes: bytes.length, sha256: hash(bytes) }] });
  await writeFile(path.join(f.candidateDirectory, 'release.json'), manifest); f.manifestHash = hash(manifest);
  const probes = makeProbes(f);
  if ((await probes.host()).elevated) { t.diagnostic('Elevated context: only refusal was exercised.'); await assert.rejects(probes.nodeRuntime(binary)); return; }
  const node = await probes.nodeRuntime(binary);
  assert.equal(node.version, '24.15.0'); assert.equal(node.arch, 'x64'); assert.equal(node.inspection, 'pe-version-resource');
  const report = await runInstallPreflight({ candidateDirectory: f.candidateDirectory, manifestHash: f.manifestHash,
    programRoot: path.join(f.root, 'program'), dataRoot: path.join(f.root, 'data'), ports: f.ports,
    requirements: { nodeVersion: '24.15.0', webView2MinimumVersion: '1.0.0.0', programReserveBytes: 0, dataReserveBytes: 0 },
    // Deterministic WebView fixture only for readiness; real registry read is
    // covered separately and cannot make this test depend on machine installs.
    probes: { ...probes, webView2: async () => ({ complete: true, versions: ['120.0.0.0', null] }) } });
  assert.equal(report.productionReady, false);
  assert.equal(report.checks.find(check => check.id === 'package').status, 'pass');
  assert.equal(report.checks.find(check => check.id === 'node').status, 'pass');
  assert.equal(report.passed, true);
  t.diagnostic('Real Windows preflight composition passed with synthetic PE and WebView version fixture.');
  await writeFile(binary, 'tampered');
  await assert.rejects(probes.nodeRuntime(binary));
});
test('Windows child probe cancellation is bounded and does not expose paths', windows, async t => {
  const f = await fixture(t), probes = makeProbes(f);
  const controller = new AbortController();
  const pending = probes.host({ signal: controller.signal }); controller.abort();
  await assert.rejects(pending, error => { assert.equal(error.message.includes(f.root), false); return true; });
});
