// Only invoked by the installed native launcher's explicit confirmation flow.
// Never starts the server or initializes/migrates configuration.
import { assertProductionReady } from '../scripts/source-guard.js';
import { resolveRuntime, recoverStaleInstance } from './runtime-context.js';
try {
  assertProductionReady();
  const context = resolveRuntime();
  if (context.mode !== 'production' || process.argv.slice(2).join(' ') !== '--confirmed') throw new Error();
  await recoverStaleInstance(context, { confirmed: true });
} catch { process.exitCode = 7; } // No native errors, private paths, token or lock contents on stdout/stderr.
