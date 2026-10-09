import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir, symlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { sourceRoot } from '../src/runtime-context.js';
const run = promisify(execFile);
const hash = text => createHash('sha256').update(text).digest('hex');

test('compiled installed-layout probe validates temporary receipts and payloads without launching the app', { skip: process.platform !== 'win32', timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-installed-launch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const local = path.join(root, 'Local'), install = path.join(local, 'Programs', 'ClipBridge');
  const binary = path.join(root, 'InstalledLaunchProbe.exe');
  await run(path.join(process.env.SystemRoot, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:exe', '/reference:System.Web.Extensions.dll', '/out:' + binary,
    path.join(sourceRoot, 'launcher/InstalledLaunch.cs'), path.join(sourceRoot, 'test/support/InstalledLaunchProbe.cs')], { windowsHide: true });
  const names = ['ClipBridge.exe', 'runtime/node.exe', 'app/src/server.js', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll'];
  const content = 'synthetic-non-executable';
  for (const name of names) { const file = path.join(install, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content); }
  let manifest = { format: 1, version: '1.0.0-test.1', commit: 'a'.repeat(40), schemaMin: 1, schemaMax: 1,
    files: names.map(name => ({ path: name, sha256: hash(content), bytes: Buffer.byteLength(content) })) };
  let receipt;
  async function seal() {
    const raw = JSON.stringify(manifest); await writeFile(path.join(install, 'release.json'), raw);
    receipt = { format: 1, application: 'ClipBridge', state: 'ready', ownerSid: 'S-1-5-21-1000-1000-1000-1000', manifestHash: hash(raw) };
    await writeFile(path.join(install, 'install-receipt.json'), JSON.stringify(receipt));
  }
  const probe = target => run(binary, [target || install, local], { windowsHide: true, timeout: 5000 });
  await assert.rejects(probe()); await seal();
  assert.equal((await probe()).stdout.trim(), path.join(local, 'ClipBridge'));
  await assert.rejects(probe(path.join(root, 'arbitrary')));
  for (const change of [{ state: 'staging' }, { ownerSid: 'foreign' }, { manifestHash: '0'.repeat(64) }]) {
    await writeFile(path.join(install, 'install-receipt.json'), JSON.stringify({ ...receipt, ...change })); await assert.rejects(probe());
  }
  await seal(); await writeFile(path.join(install, 'app', 'SOURCE-CHECKOUT'), 'guard'); await assert.rejects(probe());
  await rm(path.join(install, 'app', 'SOURCE-CHECKOUT'));
  await writeFile(path.join(install, 'runtime/node.exe'), 'modified'); await assert.rejects(probe());
  await writeFile(path.join(install, 'runtime/node.exe'), content);
  await writeFile(path.join(install, 'extra.dll'), content); await assert.rejects(probe()); await rm(path.join(install, 'extra.dll'));
  const original = JSON.parse(JSON.stringify(manifest));
  for (const change of [{ schemaMin: 2, schemaMax: 2 }, { files: [...original.files, original.files[0]] },
    { files: [...original.files, { path: '../escape', sha256: hash(content), bytes: content.length }] },
    { files: [...original.files, { path: 'NUL.txt', sha256: hash(content), bytes: content.length }] }]) {
    manifest = { ...original, ...change }; await seal(); await assert.rejects(probe());
  }
  manifest = original; await seal();
  const foreign = path.join(root, 'foreign-data'); await mkdir(foreign);
  await symlink(foreign, path.join(local, 'ClipBridge'), 'junction'); await assert.rejects(probe());
  assert.equal(await readFile(path.join(install, 'runtime/node.exe'), 'utf8'), content);
});
