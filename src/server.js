import { startBridge } from './boot.js';
import { resolveRuntime } from './runtime-context.js';
import { publicError } from './errors.js';
import { assertProductionReady } from '../scripts/source-guard.js';

// Only a reviewed release may use real clipboard/certificates/network permissions.
assertProductionReady();
try {
  const bridge = await startBridge(resolveRuntime());
  console.log('PanoKopru ready.');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void bridge.close(); });
} catch (error) {
  console.error('PanoKopru startup failed:', publicError(error).code);
  process.exitCode = 1;
}
