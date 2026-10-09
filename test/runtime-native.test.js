import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolveRuntime, prepareRuntime, sourceRoot } from '../src/runtime-context.js';
const run = promisify(execFile);
test('C#, Node and PowerShell agree on isolated identity and ports without using Windows permissions', { skip: process.platform !== 'win32' }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-native-contract-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env, LOCALAPPDATA: path.join(root, 'Local'), CLIPBRIDGE_MODE: 'test', CLIPBRIDGE_DATA_ROOT: path.join(root, 'test-data'), CLIPBRIDGE_API_PORT: '43145', CLIPBRIDGE_DESKTOP_PORT: '43146', CLIPBRIDGE_LOCAL_PORT: '43147' };
  const context = resolveRuntime({ env }); await prepareRuntime(context);
  const binary = path.join(root, 'RuntimeProbe.exe');
  await run(path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:exe', '/out:' + binary, path.join(sourceRoot, 'launcher/RuntimeContext.cs'), fileURLToPath(new URL('./support/RuntimeProbe.cs', import.meta.url))], { windowsHide: true });
  const native = await run(binary, [sourceRoot], { env, windowsHide: true });
  assert.equal(native.stdout.trim(), context.instanceId + '|43145|43146|43147');
  await assert.rejects(run(binary, [sourceRoot], { env: { ...env, CLIPBRIDGE_API_PORT: '32145' }, windowsHide: true }));
  for (const relative of ['PanoKopru','PanoKopru/child','Programs/PanoKopru/app']) {
    await assert.rejects(run(binary, [sourceRoot], { env: { ...env, CLIPBRIDGE_DATA_ROOT: path.join(env.LOCALAPPDATA,relative) }, windowsHide: true }));
  }
  // The command is fixed. Values travel in environment variables, never shell code.
  const command = "$ErrorActionPreference = 'Stop'; . (Join-Path $env:CLIPBRIDGE_TEST_SOURCE 'scripts/runtime-context.ps1'); $context = Get-ClipBridgeContext -DataRoot $env:CLIPBRIDGE_DATA_ROOT; Write-Output $context.instanceId";
  const ps = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { env: { ...env, CLIPBRIDGE_TEST_SOURCE: sourceRoot }, windowsHide: true });
  assert.equal(ps.stdout.trim(), context.instanceId);
});

test('PowerShell ownership predicate accepts only exact owned legacy/new rules', { skip: process.platform !== 'win32' }, async () => {
  const command = "$ErrorActionPreference = 'Stop'; . (Join-Path $env:CLIPBRIDGE_TEST_SOURCE 'scripts/firewall-ownership.ps1'); $target = Join-Path $env:TEMP 'ClipBridge-synthetic-node.exe'; $good = [pscustomobject]@{ Name = ('ClipBridge-Network-' + ('a' * 32) + '-HTTPS'); Group = 'ClipBridge' }; if (!(Test-ClipBridgeRuleOwnership $good @($target) $target)) { throw 'Own rule rejected' }; $legacy = [pscustomobject]@{ Name = 'ClipBridge-Local-mDNS'; Group = 'ClipBridge' }; if (!(Test-ClipBridgeRuleOwnership $legacy @($target) $target)) { throw 'Legacy rejected' }; $good.Group = 'Foreign'; if (Test-ClipBridgeRuleOwnership $good @($target) $target) { throw 'Foreign group accepted' }; $good.Group = 'ClipBridge'; if (Test-ClipBridgeRuleOwnership $good @('foreign.exe') $target) { throw 'Foreign executable accepted' }; if (Test-ClipBridgeRuleOwnership $good @($target, 'foreign.exe') $target) { throw 'Multiple executables accepted' }; $good.Name = 'ClipBridge-Unknown'; if (Test-ClipBridgeRuleOwnership $good @($target) $target) { throw 'Broad prefix accepted' }; Write-Output 'ownership PASS'";
  const result = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { env: { ...process.env, CLIPBRIDGE_TEST_SOURCE: sourceRoot }, windowsHide: true });
  assert.equal(result.stdout.trim(), 'ownership PASS');
});
