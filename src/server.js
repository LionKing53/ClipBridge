import { startBridge } from './boot.js';
import { resolveRuntime } from './runtime-context.js';
import { publicError } from './errors.js';
import { assertProductionReady } from '../scripts/source-guard.js';
import { attachSupervisorControl } from './supervisor-control.js';

// Only a reviewed release may use real clipboard/certificates/network permissions.
assertProductionReady();
try {
  const bridge = await startBridge(resolveRuntime());
  console.log('ClipBridge ready.');
  const report = () => { console.error('ClipBridge shutdown failed.'); process.exitCode = 1; };
  const control = process.env.CLIPBRIDGE_SUPERVISED === '1'
    ? attachSupervisorControl(process.stdin, () => bridge.close(), { onError: report }) : null;
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    if (control) void control.request(); else void bridge.close().catch(report);
  });
} catch (error) {
  console.error('ClipBridge startup failed:', publicError(error).code);
  process.exitCode = 1;
}
