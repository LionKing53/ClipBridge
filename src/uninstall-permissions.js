// Fixed offline removal helper. No clipboard, server start, token or CA reads.
import path from 'node:path';
import { readFile, lstat } from 'node:fs/promises';
import { resolveRuntime, assertNoLinks } from './runtime-context.js';
import { requestNetworkPermission } from './network-manager.js';
import { assertProductionReady } from '../scripts/source-guard.js';
try {
  assertProductionReady(); const context = resolveRuntime();
  if (context.mode !== 'production' || process.argv[2] !== '--confirmed') throw new Error('Explicit removal context required.');
  await assertNoLinks(context.dataRoot);
  const exists = async file => { try { await lstat(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
  if (await exists(path.join(context.dataRoot, 'instance.lock')) || await exists(path.join(context.dataRoot, 'instance.guard'))) throw new Error('Stop/recovery required.');
  const lan = path.join(context.dataRoot, 'lan');
  if (await exists(lan)) {
    const saved = JSON.parse(await readFile(path.join(context.dataRoot, 'runtime-context.json'), 'utf8'));
    if (JSON.stringify(saved) !== JSON.stringify(context)) throw new Error('Identity mismatch.');
    await assertNoLinks(lan); await requestNetworkPermission(lan, null, 'cleanup');
  }
  process.stdout.write('Permissions cleaned; user data retained.\n');
} catch { process.stderr.write('Removal permission cleanup failed or cancelled; program retained.\n'); process.exitCode = 1; }
