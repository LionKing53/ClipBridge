import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { runInstallPreflight, evaluateWebViewRuntime, validWebViewVersion } from '../src/install-preflight.js';
const hash = value => createHash('sha256').update(value).digest('hex');
const code = (report, id) => report.checks.find(check => check.id === id).code;

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-preflight-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const candidateDirectory = path.join(root, 'candidate');
  await mkdir(path.join(candidateDirectory, 'runtime'), { recursive: true });
  const payload = 'synthetic, never executed';
  await writeFile(path.join(candidateDirectory, 'runtime', 'node.exe'), payload);
  const manifest = JSON.stringify({ format: 1, version: '1.0.0', commit: 'a'.repeat(40), schemaMin: 1, schemaMax: 1,
    files: [{ path: 'runtime/node.exe', bytes: Buffer.byteLength(payload), sha256: hash(payload) }] });
  await writeFile(path.join(candidateDirectory, 'release.json'), manifest);
  const options = { candidateDirectory, manifestHash: hash(manifest), programRoot: path.join(root, 'program'), dataRoot: path.join(root, 'data'),
    requirements: { nodeVersion: '24.15.0', webView2MinimumVersion: '120.0.0.0', programReserveBytes: 100, dataReserveBytes: 100 },
    ports: [45145, 45146, 45147], probes: {
      host: async () => ({ platform: 'win32', arch: 'x64' }),
      webView2: async () => ({ complete: true, versions: [null, '130.0.1.0'] }),
      nodeRuntime: async () => ({ version: '24.15.0', platform: 'win32', arch: 'x64' }),
      destination: async () => ({ writable: true, volumeId: 'synthetic-volume', freeBytes: 10000 }),
      port: async () => true,
    } };
  return { root, options, programBytes: 2 * (Buffer.byteLength(payload) + Buffer.byteLength(manifest)) + 100 };
}

test('preflight verifies a synthetic package without creating destinations or enabling startup', async t => {
  const { root, options } = await fixture(t);
  const before = await readdir(root);
  const report = await runInstallPreflight(options);
  assert.equal(report.passed, true); assert.equal(report.productionReady, false); assert.equal(report.startAtLogin, false);
  assert.deepEqual(await readdir(root), before);
  assert.equal((await runInstallPreflight({ ...options, startAtLogin: true })).startAtLogin, true);
});

test('WebView2 detection handles both registry scopes, minimum version and unknown state', () => {
  for (const value of ['', '0.0.0.0', '130', '130.0.0.0-beta', '999999999999999999999.0.0.0']) assert.equal(validWebViewVersion(value), false);
  const state = versions => evaluateWebViewRuntime({ complete: true, versions }, '120.0.0.0');
  assert.equal(state([null, '0.0.0.0']), 'missing');
  assert.equal(state(['119.99.99.99', null]), 'outdated');
  assert.equal(state(['119.0.0.0', '120.0.0.0']), 'ready');
  assert.equal(state(['121.0.0.0', '119.0.0.0']), 'ready');
  assert.equal(evaluateWebViewRuntime({ complete: false, versions: ['130.0.0.0'] }, '120.0.0.0'), 'unknown');
  assert.equal(evaluateWebViewRuntime({}, '120.0.0.0'), 'unknown');
});

test('preflight rejects unsafe or incomplete inputs before invoking probes', async t => {
  const { options } = await fixture(t);
  options.probes.host = () => assert.fail('No OS probe should run');
  for (const patch of [ { dataRoot: options.programRoot }, { programRoot: path.dirname(options.candidateDirectory) },
    { dataRoot: 'relative' }, { ports: [45145, 45145, 45147] }, { probes: {} }, { startAtLogin: 'yes' },
    { requirements: { ...options.requirements, dataReserveBytes: -1 } } ]) {
    await assert.rejects(runInstallPreflight({ ...options, ...patch }), { code: 'ERR_INSTALL_PREFLIGHT_INPUT' });
  }
});

test('existing program or data roots require separate migration/update; never overwritten', async t => {
  const { options } = await fixture(t);
  await mkdir(options.programRoot); await mkdir(options.dataRoot);
  options.probes.destination = () => assert.fail('Do not inspect an existing personal target');
  const report = await runInstallPreflight(options);
  assert.equal(report.passed, false);
  assert.equal(code(report, 'program'), 'ERR_INSTALL_EXISTING_TARGET');
  assert.equal(code(report, 'data'), 'ERR_INSTALL_EXISTING_TARGET');
});

test('package tampering prevents even the injected executable inspection', async t => {
  const { options } = await fixture(t);
  await writeFile(path.join(options.candidateDirectory, 'runtime', 'node.exe'), 'tampered');
  options.probes.nodeRuntime = () => assert.fail('Never execute unverified bytes');
  const report = await runInstallPreflight(options);
  assert.equal(code(report, 'package'), 'ERR_INSTALL_CHECK_FAILED');
  assert.equal(code(report, 'node'), 'ERR_INSTALL_PACKAGE_REQUIRED');
});

test('disk budget sums destinations sharing a volume, using the lower free-space observation', async t => {
  const { options, programBytes } = await fixture(t);
  options.probes.destination = async root => ({ writable: true, volumeId: 'same', freeBytes: programBytes + (root === options.programRoot ? 1000 : 50) });
  assert.equal(code(await runInstallPreflight(options), 'capacity'), 'ERR_INSTALL_DISK_SPACE');
  options.probes.destination = async root => ({ writable: true, volumeId: root, freeBytes: root === options.programRoot ? programBytes : 100 });
  assert.equal(code(await runInstallPreflight(options), 'capacity'), 'OK');
});

test('platform, version, WebView2, write access and port failures are distinct and fail closed', async t => {
  const { options } = await fixture(t);
  options.probes.host = async () => ({ platform: 'win32', arch: 'arm64' });
  options.probes.nodeRuntime = async () => ({ version: '22.0.0', platform: 'win32', arch: 'x64' });
  options.probes.webView2 = async () => ({ complete: true, versions: [] });
  options.probes.destination = async () => ({ writable: false });
  options.probes.port = async () => 'true';
  const report = await runInstallPreflight(options);
  for (const [id, expected] of [['host','PLATFORM'], ['node','HOST_REQUIRED'], ['webview2','WEBVIEW_MISSING'], ['program','WRITE_ACCESS'], ['port-1','PORT_UNAVAILABLE']]) {
    assert.equal(code(report, id), 'ERR_INSTALL_' + expected);
  }
  assert.equal(report.passed, false);
  options.probes.host = async () => ({ platform: 'win32', arch: 'x64' });
  assert.equal(code(await runInstallPreflight(options), 'node'), 'ERR_INSTALL_NODE_VERSION');
});

test('missing observations and sensitive exception messages do not become successful or public', async t => {
  const { options } = await fixture(t);
  options.probes.webView2 = async () => { throw new Error('synthetic-secret-and-private-path'); };
  options.probes.destination = async () => ({ writable: true, volumeId: 'synthetic', freeBytes: NaN });
  options.probes.port = async () => undefined;
  const report = await runInstallPreflight(options);
  assert.equal(report.passed, false); assert.equal(code(report, 'program'), 'ERR_INSTALL_DISK_UNKNOWN');
  assert.equal(JSON.stringify(report).includes('synthetic-secret'), false);
  assert.equal(JSON.stringify(report).includes(options.programRoot), false);
});

test('stalled OS probe times out, signals cancellation and cannot grant readiness', async t => {
  const { options } = await fixture(t);
  let cancelled = false;
  options.probeTimeoutMs = 20;
  options.probes.webView2 = ({ signal }) => new Promise(() => {
    signal.addEventListener('abort', () => { cancelled = true; }, { once: true });
  });
  const report = await runInstallPreflight(options);
  assert.equal(code(report, 'webview2'), 'ERR_INSTALL_PROBE_TIMEOUT');
  assert.equal(cancelled, true); assert.equal(report.passed, false);
});

test('a linked destination ancestor is blocked without inspecting its redirected target', async t => {
  const { root, options } = await fixture(t);
  const destination = path.join(root, 'redirected');
  const link = path.join(root, 'linked');
  await mkdir(destination); await symlink(destination, link, process.platform === 'win32' ? 'junction' : 'dir');
  options.programRoot = path.join(link, 'program');
  const probe = options.probes.destination;
  options.probes.destination = async target => {
    assert.notEqual(target, options.programRoot);
    return probe(target);
  };
  const report = await runInstallPreflight(options);
  assert.equal(report.passed, false); assert.equal(code(report, 'program'), 'ERR_INSTALL_CHECK_FAILED');
  assert.deepEqual(await readdir(destination), []);
});

test('elevated installation observation cannot stand in for the intended user context', async t => {
  const { options } = await fixture(t);
  options.probes.host = async () => ({ platform: 'win32', arch: 'x64', elevated: true });
  options.probes.nodeRuntime = () => assert.fail('Host rejection must prevent candidate inspection');
  const report = await runInstallPreflight(options);
  assert.equal(report.passed, false);
  assert.equal(code(report, 'host'), 'ERR_INSTALL_ELEVATED_CONTEXT');
  assert.equal(code(report, 'node'), 'ERR_INSTALL_HOST_REQUIRED');
});
