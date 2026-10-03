// Real read-only Windows observations, currently scoped to isolated development.
// This does not authorize installation or relax any production startup guard.
import path from 'node:path';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { lstat } from 'node:fs/promises';
import { assertRuntimeContext, assertNoLinks, within } from './runtime-context.js';
import { verifyRelease } from './release-store.js';
const execute = promisify(execFile);
const helper = fileURLToPath(new URL('../scripts/inspect-install-host.ps1', import.meta.url));
const fail = () => Object.assign(new Error('Isolated Windows installation observation unavailable.'), { code: 'ERR_INSTALL_WINDOWS_PROBE' });

// No wildcard listeners in source tests. A live listener is closed on every
// outcome, including cancellation during asynchronous binding.
export async function probeLoopbackPort(port, { signal } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw fail();
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const server = net.createServer(socket => socket.destroy());
    let aborted = false;
    const onAbort = () => { aborted = true; if (server.listening) server.close(); };
    const finish = (error, available) => {
      signal?.removeEventListener('abort', onAbort);
      if (aborted || signal?.aborted) reject(fail());
      else if (error && error.code !== 'EADDRINUSE' && error.code !== 'EACCES') reject(fail());
      else resolve(available);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    server.once('error', error => finish(error, false));
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => server.close(() => finish(null, true)));
  });
}

export function createIsolatedWindowsInstallProbes({ context, candidateDirectory, manifestHash }) {
  assertRuntimeContext(context);
  if (process.platform !== 'win32' || context.mode === 'production' ||
      typeof candidateDirectory !== 'string' || !path.isAbsolute(candidateDirectory) ||
      !within(context.dataRoot, candidateDirectory) || path.resolve(candidateDirectory) === path.resolve(context.dataRoot) ||
      !/^[a-f0-9]{64}$/.test(manifestHash || '')) throw fail();
  const powershell = path.join(process.env.SystemRoot || '', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  if (!path.isAbsolute(powershell)) throw fail();
  const scoped = async target => {
    if (typeof target !== 'string' || !path.isAbsolute(target) || !within(context.dataRoot, target) ||
        path.resolve(target) === path.resolve(context.dataRoot)) throw fail();
    await assertNoLinks(context.dataRoot); await assertNoLinks(target);
    if (!(await lstat(context.dataRoot)).isDirectory()) throw fail();
  };
  async function read(operation, target, { signal } = {}) {
    signal?.throwIfAborted();
    if (target) await scoped(target);
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helper, '-Operation', operation];
    if (target) args.push('-TargetBase64', Buffer.from(target, 'utf8').toString('base64'));
    try {
      const result = await execute(powershell, args, { windowsHide: true, shell: false, timeout: 10000, maxBuffer: 16384, signal });
      const value = JSON.parse(result.stdout.trim());
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail();
      return value;
    } catch { throw fail(); }
  }
  const sanitized = operation => async (...args) => {
    try { return await operation(...args); } catch { throw fail(); }
  };
  return Object.freeze({
    host: sanitized(options => read('Host', null, options)),
    webView2: sanitized(options => read('WebView2', null, options)),
    destination: sanitized(async (target, options) => {
      await scoped(target);
      if (within(candidateDirectory, target) || within(target, candidateDirectory)) throw fail();
      return read('Destination', target, options);
    }),
    nodeRuntime: sanitized(async (target, options) => {
      if (path.resolve(target) !== path.join(path.resolve(candidateDirectory), 'runtime', 'node.exe')) throw fail();
      await scoped(target);
      // Recheck the pinned package immediately before reading PE metadata. No
      // candidate code is executed, even when a caller supplies a forged binary.
      await verifyRelease(candidateDirectory, manifestHash);
      return read('NodeMetadata', target, options);
    }),
    port: (port, options) => {
      if (!Object.values(context.ports).includes(port)) throw fail();
      return probeLoopbackPort(port, options);
    },
  });
}
