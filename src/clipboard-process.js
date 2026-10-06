import { spawn } from 'node:child_process';
import { operationError } from './errors.js';

// One owned PowerShell child only. stderr is deliberately not captured: native
// errors can contain clipboard text or private filenames. Never kill by PID/name.
export function createClipboardProcess({ spawnChild = spawn, timeoutMs = 30000, maxOutputBytes = 128 * 1024 ** 2 } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) throw new TypeError('Invalid clipboard process limits.');
  return (script, input = '', { sta = false, operation = 'write' } = {}) => new Promise((resolve, reject) => {
    const code = operation === 'read' ? 'ERR_CLIPBOARD_READ' : 'ERR_CLIPBOARD_WRITE';
    let child;
    try {
      child = spawnChild('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', ...(sta ? ['-STA'] : []), '-Command', script],
        { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'ignore'] });
    } catch { reject(operationError(code)); return; }
    const chunks = []; let bytes = 0, failure, settled = false;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); if (error) reject(error); else resolve(value); };
    const stop = error => {
      if (failure || settled) return;
      failure = error;
      try { child.kill(); } catch { /* only this child; report the original safe error */ }
      finish(failure);
    };
    const timer = setTimeout(() => stop(operationError('ERR_CLIPBOARD_TIMEOUT')), timeoutMs);
    child.once('error', () => finish(operationError(code)));
    child.stdin.on('error', () => stop(operationError(code)));
    child.stdout.on('error', () => stop(operationError(code)));
    child.stdout.on('data', chunk => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > maxOutputBytes) { stop(Object.assign(new Error('Clipboard output exceeds processing limit.'), { statusCode: 413 })); return; }
      chunks.push(Buffer.from(chunk));
    });
    child.once('close', exitCode => {
      if (failure || exitCode !== 0) finish(failure || operationError(code));
      else finish(null, Buffer.concat(chunks).toString('ascii'));
    });
    try { child.stdin.end(input, 'ascii'); } catch { stop(operationError(code)); }
  });
}

export const runClipboardProcess = createClipboardProcess();
