import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, stat, symlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { sourceRoot } from '../src/runtime-context.js';
const run = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('compiled fresh-install transaction uses only synthetic files and injected system operations', { skip: process.platform !== 'win32', timeout: 60000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-fresh-install-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const binary = path.join(root, 'FreshInstallProbe.exe');
  await run(path.join(process.env.SystemRoot, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:exe', '/reference:System.Web.Extensions.dll', '/out:' + binary,
    path.join(sourceRoot, 'launcher/InstalledLaunch.cs'), path.join(sourceRoot, 'launcher/FreshInstall.cs'), path.join(sourceRoot, 'launcher/RemoveInstall.cs'), path.join(sourceRoot, 'test/support/FreshInstallProbe.cs')], { windowsHide: true });
  let counter = 0;
  async function fixture() {
    const dir = path.join(root, String(++counter)), local = path.join(dir, 'Local'), payload = path.join(dir, 'payload');
    await mkdir(local, { recursive: true });
    const names = ['ClipBridge.exe', 'runtime/node.exe', 'app/src/server.js', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll', 'WebView2Loader.dll'];
    const bytes = Buffer.from('synthetic-non-executable');
    for (const name of names) { const file = path.join(payload, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, bytes); }
    const raw = JSON.stringify({ format: 1, version: '1.0.0-test.1', commit: 'a'.repeat(40), schemaMin: 1, schemaMax: 1, files: names.map(name => ({ path: name, sha256: hash(bytes), bytes: bytes.length })) });
    await writeFile(path.join(payload, 'release.json'), raw);
    const target = path.join(local, 'Programs', 'ClipBridge'), data = path.join(local, 'ClipBridge');
    return { local, payload, target, data, run: async (scenario = 'ok', desktop = false, startup = false) => {
      try { return JSON.parse((await run(binary, [local, payload, hash(raw), scenario, desktop ? 'yes' : 'no', startup ? 'yes' : 'no'], { windowsHide: true, timeout: 10000 })).stdout); }
      catch (error) { if (error.code === 2) return JSON.parse(error.stdout); throw error; }
    } };
  }
  await t.test('first install seals ready receipt, preserves options and never creates data or starts a program', async () => {
    const f = await fixture(); const result = await f.run('ok', true, true);
    assert.equal(result.ok, true); assert.equal(result.desktop, true); assert.equal(result.startup, true);
    assert.deepEqual(result.warnings, []);
    const receipt = JSON.parse(await readFile(path.join(f.target, 'install-receipt.json'), 'utf8'));
    assert.equal(receipt.state, 'ready'); assert.equal(receipt.ownerSid, 'S-1-5-21-1000-1000-1000-1000');
    assert.equal(receipt.requestedStartAtLogin, true); assert.equal(await stat(f.data).catch(() => null), null);
    assert.deepEqual(await readdir(path.join(f.local, 'Programs')), ['ClipBridge']);
  });
  await t.test('existing program and even empty existing data are never adopted or overwritten', async () => {
    for (const name of ['target', 'data']) {
      const f = await fixture(); await mkdir(f[name], { recursive: true }); await writeFile(path.join(f[name], 'foreign.txt'), 'untouched');
      const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.probes, 0);
      assert.equal(await readFile(path.join(f[name], 'foreign.txt'), 'utf8'), 'untouched');
    }
  });
  await t.test('failed prerequisites or source guard create no installation staging', async () => {
    const f = await fixture(); assert.equal((await f.run('probe-fail')).ok, false);
    assert.equal(await stat(path.join(f.local, 'Programs')).catch(() => null), null);
    await writeFile(path.join(f.payload, 'app', 'SOURCE-CHECKOUT'), 'guard');
    const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.probes, 0);
  });
  await t.test('renamed installer refuses old program, retained data and old maintenance lock', async () => {
    for (const relative of ['Programs/PanoKopru', 'PanoKopru', 'Programs/.PanoKopru-install-lock']) {
      const f = await fixture(), old = path.join(f.local, relative);
      await mkdir(old, { recursive: true }); await writeFile(path.join(old, 'foreign.txt'), 'retained');
      const result = await f.run(); assert.equal(result.ok, false); assert.equal(result.probes, 0);
      assert.equal(await readFile(path.join(old, 'foreign.txt'), 'utf8'), 'retained');
      assert.equal(await stat(f.target).catch(() => null), null);
    }
  });
  await t.test('source tampering during copy leaves a nonactivated recoverable stage, no data and no guard theft', async () => {
    const f = await fixture(); assert.equal((await f.run('source-changed')).ok, false);
    assert.equal(await stat(f.target).catch(() => null), null); assert.equal(await stat(f.data).catch(() => null), null);
    const entries = await readdir(path.join(f.local, 'Programs'));
    assert.equal(entries.length, 1); assert.match(entries[0], /^ClipBridge\.stage-/);
    assert.equal(JSON.parse(await readFile(path.join(f.local, 'Programs', entries[0], 'install-receipt.json'))).state, 'staging');
  });
  await t.test('destination appearing before activation remains untouched; staged program is not substituted', async () => {
    const f = await fixture(); assert.equal((await f.run('target-race')).ok, false);
    assert.deepEqual(await readdir(f.target), ['foreign.txt']); assert.equal(await readFile(path.join(f.target, 'foreign.txt'), 'utf8'), 'untouched');
  });
  await t.test('cancellation before activation preserves the stage without program or data activation', async () => {
    const f = await fixture(); assert.equal((await f.run('cancel')).ok, false);
    assert.equal(await stat(f.target).catch(() => null), null); assert.equal(await stat(f.data).catch(() => null), null);
    const entries = await readdir(path.join(f.local, 'Programs'));
    assert.equal(entries.length, 1); assert.match(entries[0], /^ClipBridge\.stage-/);
  });
  await t.test('shortcut failure reports partial success; valid program is retained and startup defaults off', async () => {
    const f = await fixture(); const result = await f.run('shortcut-fail');
    assert.equal(result.ok, true); assert.deepEqual(result.warnings, ['ERR_INSTALL_SHORTCUTS_PARTIAL']);
    assert.equal(result.startup, false); assert.equal(JSON.parse(await readFile(path.join(f.target, 'install-receipt.json'))).state, 'ready');
    assert.equal((await f.run()).ok, false);
  });
  await t.test('existing install guard and linked destination are rejected without adoption', async () => {
    const f = await fixture(), guard = path.join(f.local, 'Programs', '.ClipBridge-install-lock');
    await mkdir(guard, { recursive: true }); await writeFile(path.join(guard, 'owner'), 'foreign');
    assert.equal((await f.run()).ok, false); assert.equal(await readFile(path.join(guard, 'owner'), 'utf8'), 'foreign');
    const g = await fixture(), foreign = path.join(root, 'unrelated'); await mkdir(foreign);
    await symlink(foreign, path.join(g.local, 'Programs'), 'junction'); assert.equal((await g.run()).ok, false);
    assert.deepEqual(await readdir(foreign), []);
  });
  await t.test('removal deletes only validated program inventory and retains data', async () => {
    const f = await fixture(); assert.equal((await f.run('remove-ok')).ok, true);
    assert.equal(await stat(f.target).catch(() => null), null);
    assert.equal(await readFile(path.join(f.data, 'synthetic.txt'), 'utf8'), 'retained');
  });
  await t.test('cancelled permission, shortcut failure and foreign files preserve program and data', async () => {
    for (const scenario of ['remove-cancel', 'remove-shortcut-fail', 'remove-foreign']) {
      const f = await fixture(); assert.equal((await f.run(scenario)).ok, false);
      assert.ok((await stat(path.join(f.target, 'ClipBridge.exe'))).isFile());
      assert.equal(await readFile(path.join(f.data, 'synthetic.txt'), 'utf8'), 'retained');
      if (scenario === 'remove-foreign') assert.equal(await readFile(path.join(f.target, 'foreign.txt'), 'utf8'), 'untouched');
    }
  });
});
