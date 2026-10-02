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
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-native-contract-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env, LOCALAPPDATA: path.join(root, 'Local'), PANOKOPRU_MODE: 'test', PANOKOPRU_DATA_ROOT: path.join(root, 'test-data'), PANOKOPRU_API_PORT: '43145', PANOKOPRU_DESKTOP_PORT: '43146', PANOKOPRU_LOCAL_PORT: '43147' };
  const context = resolveRuntime({ env }); await prepareRuntime(context);
  const binary = path.join(root, 'RuntimeProbe.exe');
  await run(path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:exe', '/out:' + binary, path.join(sourceRoot, 'launcher/RuntimeContext.cs'), fileURLToPath(new URL('./support/RuntimeProbe.cs', import.meta.url))], { windowsHide: true });
  const native = await run(binary, [sourceRoot], { env, windowsHide: true });
  assert.equal(native.stdout.trim(), context.instanceId + '|43145|43146|43147');
  await assert.rejects(run(binary, [sourceRoot], { env: { ...env, PANOKOPRU_API_PORT: '32145' }, windowsHide: true }));
  // The command is fixed. Values travel in environment variables, never shell code.
  const command = "$ErrorActionPreference = 'Stop'; . (Join-Path $env:PANOKOPRU_TEST_SOURCE 'scripts/runtime-context.ps1'); $context = Get-PanoKopruContext -DataRoot $env:PANOKOPRU_DATA_ROOT; Write-Output $context.instanceId";
  const ps = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { env: { ...env, PANOKOPRU_TEST_SOURCE: sourceRoot }, windowsHide: true });
  assert.equal(ps.stdout.trim(), context.instanceId);
});

test('PowerShell ownership predicate accepts only exact owned legacy/new rules', { skip: process.platform !== 'win32' }, async () => {
  const command = "$ErrorActionPreference = 'Stop'; . (Join-Path $env:PANOKOPRU_TEST_SOURCE 'scripts/firewall-ownership.ps1'); $target = Join-Path $env:TEMP 'PanoKopru-synthetic-node.exe'; $good = [pscustomobject]@{ Name = ('PanoKopru-Network-' + ('a' * 32) + '-HTTPS'); Group = 'PanoKopru' }; if (!(Test-PanoKopruRuleOwnership $good @($target) $target)) { throw 'Own rule rejected' }; $legacy = [pscustomobject]@{ Name = 'PanoKopru-Local-mDNS'; Group = 'PanoKopru' }; if (!(Test-PanoKopruRuleOwnership $legacy @($target) $target)) { throw 'Legacy rejected' }; $good.Group = 'Foreign'; if (Test-PanoKopruRuleOwnership $good @($target) $target) { throw 'Foreign group accepted' }; $good.Group = 'PanoKopru'; if (Test-PanoKopruRuleOwnership $good @('foreign.exe') $target) { throw 'Foreign executable accepted' }; if (Test-PanoKopruRuleOwnership $good @($target, 'foreign.exe') $target) { throw 'Multiple executables accepted' }; $good.Name = 'PanoKopru-Unknown'; if (Test-PanoKopruRuleOwnership $good @($target) $target) { throw 'Broad prefix accepted' }; Write-Output 'ownership PASS'";
  const result = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { env: { ...process.env, PANOKOPRU_TEST_SOURCE: sourceRoot }, windowsHide: true });
  assert.equal(result.stdout.trim(), 'ownership PASS');
});
