// First-install decision engine, NOT a production installer or authorization.
// OS probes are mandatory/injected. No download, UAC, process stop or write here.
import path from 'node:path';
import { lstat } from 'node:fs/promises';
import { assertNoLinks, within } from './runtime-context.js';
import { verifyRelease } from './release-store.js';

const invalid = () => Object.assign(new Error('Invalid explicit installer preflight inputs.'), { code: 'ERR_INSTALL_PREFLIGHT_INPUT' });
const bytes = value => Number.isSafeInteger(value) && value >= 0;
const versionParts = value => typeof value === 'string' && /^\d+\.\d+\.\d+\.\d+$/.test(value)
  ? value.split('.').map(Number).filter(Number.isSafeInteger) : [];
export function validWebViewVersion(value) {
  const parts = versionParts(value);
  return parts.length === 4 && parts.some(part => part > 0);
}
function atLeast(value, minimum) {
  const a = versionParts(value), b = versionParts(minimum);
  for (let i = 0; i < 4; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return true;
}

// pv values must come from the WebView2 Runtime's per-user/per-machine registry
// keys, not Edge Stable, the SDK, or a browser-version API accepting previews.
export function evaluateWebViewRuntime(snapshot, minimum) {
  if (!validWebViewVersion(minimum)) throw invalid();
  if (!snapshot || snapshot.complete !== true || !Array.isArray(snapshot.versions) ||
      snapshot.versions.some(value => value !== null && typeof value !== 'string')) return 'unknown';
  const versions = snapshot.versions.filter(validWebViewVersion);
  if (!versions.length) return 'missing';
  return versions.some(value => atLeast(value, minimum)) ? 'ready' : 'outdated';
}

async function absentTarget(root) {
  await assertNoLinks(root);
  try { await lstat(root); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

export async function runInstallPreflight(options) {
  const { candidateDirectory, manifestHash, programRoot, dataRoot, requirements,
    ports, probes, startAtLogin = false, probeTimeoutMs = 5000 } = options || {};
  const roots = [candidateDirectory, programRoot, dataRoot];
  if (roots.some(root => typeof root !== 'string' || !path.isAbsolute(root) || path.parse(root).root === path.resolve(root)) ||
      roots.some((root, i) => roots.some((other, j) => i !== j && within(root, other))) ||
      typeof startAtLogin !== 'boolean' || !Number.isInteger(probeTimeoutMs) || probeTimeoutMs < 1 || probeTimeoutMs > 30000 ||
      !requirements || !validWebViewVersion(requirements.webView2MinimumVersion) ||
      !/^\d+\.\d+\.\d+$/.test(requirements.nodeVersion || '') ||
      !bytes(requirements.programReserveBytes) || !bytes(requirements.dataReserveBytes) ||
      !Array.isArray(ports) || ports.length !== 3 || new Set(ports).size !== 3 ||
      ports.some(port => !Number.isInteger(port) || port < 1024 || port > 65535) ||
      !['host', 'webView2', 'nodeRuntime', 'destination', 'port'].every(key => typeof probes?.[key] === 'function')) throw invalid();

  const checks = [];
  const add = (id, status, code) => checks.push({ id, status, code });
  async function probe(name, ...args) {
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(() => probes[name](...args, { signal: controller.signal })),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            reject(Object.assign(new Error('Probe timed out.'), { code: 'ERR_INSTALL_PROBE_TIMEOUT' }));
            controller.abort();
          }, probeTimeoutMs);
        }),
      ]);
    } finally { clearTimeout(timer); }
  }
  // Deliberately never include exception messages, executable paths, registry
  // values, user names or probe payloads in this public report.
  async function check(id, action) {
    try { const code = await action(); add(id, code === 'OK' ? 'pass' : 'blocked', code); }
    catch (error) { add(id, 'blocked', error?.code === 'ERR_INSTALL_PROBE_TIMEOUT' ? error.code : 'ERR_INSTALL_CHECK_FAILED'); }
  }
  await check('host', async () => {
    const host = await probe('host');
    return host?.platform === 'win32' && host?.arch === 'x64' ? 'OK' : 'ERR_INSTALL_PLATFORM';
  });
  let manifest;
  await check('package', async () => {
    manifest = await verifyRelease(candidateDirectory, manifestHash);
    if (!manifest.files.some(file => file.path === 'runtime/node.exe' && file.bytes > 0)) {
      manifest = undefined;
      return 'ERR_INSTALL_NODE_MISSING';
    }
    return 'OK';
  });
  if (manifest && checks.find(check => check.id === 'host').status === 'pass') {
    await check('node', async () => {
      const node = await probe('nodeRuntime', path.join(candidateDirectory, 'runtime', 'node.exe'));
      return node?.version === requirements.nodeVersion && node.platform === 'win32' && node.arch === 'x64'
        ? 'OK' : 'ERR_INSTALL_NODE_VERSION';
    });
  } else add('node', 'blocked', manifest ? 'ERR_INSTALL_HOST_REQUIRED' : 'ERR_INSTALL_PACKAGE_REQUIRED');
  await check('webview2', async () => {
    const state = evaluateWebViewRuntime(await probe('webView2'), requirements.webView2MinimumVersion);
    return { ready: 'OK', missing: 'ERR_INSTALL_WEBVIEW_MISSING', outdated: 'ERR_INSTALL_WEBVIEW_OUTDATED', unknown: 'ERR_INSTALL_WEBVIEW_UNKNOWN' }[state];
  });

  const destinations = [];
  for (const [id, root] of [['program', programRoot], ['data', dataRoot]]) {
    await check(id, async () => {
      // Any existing target (even empty) requires a separate resume/update/
      // migration workflow. Never infer ownership from its name.
      if (!await absentTarget(root)) return 'ERR_INSTALL_EXISTING_TARGET';
      const result = await probe('destination', root);
      if (result?.writable !== true) return 'ERR_INSTALL_WRITE_ACCESS';
      if (typeof result.volumeId !== 'string' || !result.volumeId || !bytes(result.freeBytes)) return 'ERR_INSTALL_DISK_UNKNOWN';
      destinations.push({ id, volumeId: result.volumeId, freeBytes: result.freeBytes });
      return 'OK';
    });
  }
  await check('capacity', async () => {
    if (!manifest || destinations.length !== 2) return 'ERR_INSTALL_CAPACITY_UNKNOWN';
    // BigInt avoids wraparound on hostile/large manifests. Stage + final copy
    // are budgeted together; reserves are explicit policy, not a disk quota.
    const manifestBytes = BigInt((await lstat(path.join(candidateDirectory, 'release.json'))).size);
    const payload = manifest.files.reduce((sum, file) => sum + BigInt(file.bytes), manifestBytes);
    const needs = { program: payload * 2n + BigInt(requirements.programReserveBytes), data: BigInt(requirements.dataReserveBytes) };
    const volumes = new Map();
    for (const target of destinations) {
      const prior = volumes.get(target.volumeId);
      const available = BigInt(target.freeBytes);
      volumes.set(target.volumeId, { need: (prior?.need || 0n) + needs[target.id],
        free: prior && prior.free < available ? prior.free : available });
    }
    return [...volumes.values()].every(volume => volume.free >= volume.need) ? 'OK' : 'ERR_INSTALL_DISK_SPACE';
  });
  for (let i = 0; i < ports.length; i++) {
    await check(`port-${i + 1}`, async () => await probe('port', ports[i]) === true ? 'OK' : 'ERR_INSTALL_PORT_UNAVAILABLE');
  }
  return { format: 1, purpose: 'first-install-preflight', passed: checks.every(check => check.status === 'pass'),
    productionReady: false, startAtLogin, checks };
}
