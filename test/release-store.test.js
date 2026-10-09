import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { resolveRuntime, prepareRuntime } from '../src/runtime-context.js';
import { createIsolatedReleaseStore, verifyRelease, validateReleaseManifest } from '../src/release-store.js';
const hash = value => createHash('sha256').update(value).digest('hex');
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ClipBridge-release-test-')); t.after(() => rm(root, { recursive: true, force: true }));
  const context = resolveRuntime({ env: { LOCALAPPDATA: path.join(root, 'local'), CLIPBRIDGE_MODE:'test', CLIPBRIDGE_DATA_ROOT: path.join(root,'data'), CLIPBRIDGE_API_PORT:'45145', CLIPBRIDGE_DESKTOP_PORT:'45146', CLIPBRIDGE_LOCAL_PORT:'45147' } }); await prepareRuntime(context);
  const make = async (version, schemaMin = 1, schemaMax = 1) => {
    const directory = path.join(root, version); await mkdir(directory);
    const content = 'synthetic program ' + version; const manifest = { format:1, version, commit:'a'.repeat(40), schemaMin, schemaMax, files:[{ path:'app.txt', bytes:Buffer.byteLength(content), sha256:hash(content) }] };
    const serialized = JSON.stringify(manifest); await writeFile(path.join(directory,'app.txt'), content); await writeFile(path.join(directory,'release.json'), serialized);
    return { directory, hash:hash(serialized), manifest };
  };
  return { root, context, make };
}
test('package verifier rejects unlisted files, traversal, device names, case duplicates and tampering', async t => {
  const { make } = await fixture(t); const candidate = await make('1.0.0');
  await verifyRelease(candidate.directory, candidate.hash);
  await writeFile(path.join(candidate.directory,'extra.txt'), 'unapproved'); await assert.rejects(verifyRelease(candidate.directory,candidate.hash), /Unlisted/);
  await rm(path.join(candidate.directory,'extra.txt')); await writeFile(path.join(candidate.directory,'app.txt'), 'tampered'); await assert.rejects(verifyRelease(candidate.directory,candidate.hash), /integrity/);
  for (const name of ['../secret', 'C:/secret', 'CON.txt', 'dir/../file', 'dir./file', 'private.key']) assert.throws(() => validateReleaseManifest({ ...candidate.manifest, files:[{...candidate.manifest.files[0],path:name}] }));
  assert.throws(() => validateReleaseManifest({ ...candidate.manifest, files:[...candidate.manifest.files,{...candidate.manifest.files[0],path:'APP.TXT'}] }), /Duplicate/);
});
test('failed update recovery and explicit rollback preserve transfers created after the update', async t => {
  const { context, make } = await fixture(t); let healthy = true;
  const store = await createIsolatedReleaseStore({ context, stop:async()=>{}, isStopped:async()=>true, probe:async()=>true, activate:async()=>healthy });
  const first = await make('1.0.0'), second = await make('1.1.0'), third = await make('1.2.1');
  await store.update(first.directory,first.hash); await store.update(second.directory,second.hash);
  const transfer = path.join(context.dataRoot,'new-transfer.txt'); await writeFile(transfer,'retain after update');
  await store.rollback({confirmedStopped:true}); assert.equal((await store.status()).current.version,'1.0.0'); assert.equal(await readFile(transfer,'utf8'),'retain after update');
  healthy = false; await assert.rejects(store.update(third.directory,third.hash), {code:'ERR_UPDATE_RECOVERY_REQUIRED'});
  await assert.rejects(store.update(second.directory,second.hash), /recovery/);
  await assert.rejects(store.recover(), /stopped-state/);
  assert.equal((await store.recover({confirmedStopped:true})).dataRestored,false); assert.equal((await store.status()).current.version,'1.0.0'); assert.equal(await readFile(transfer,'utf8'),'retain after update');
});
test('old program cannot silently open a newer schema or restore an old data snapshot', async t => {
  const { context, make } = await fixture(t);
  const store = await createIsolatedReleaseStore({context,stop:async()=>{},isStopped:async()=>true,probe:async()=>true,activate:async()=>true});
  const first=await make('1.0.0'), second=await make('2.0.0',1,2); await store.update(first.directory,first.hash); await store.update(second.directory,second.hash);
  await writeFile(path.join(context.dataRoot,'data-schema.json'),'{"version":2}');
  await assert.rejects(store.rollback({confirmedStopped:true}), /incompatible/); assert.equal((await store.status()).current.version,'2.0.0');
});
