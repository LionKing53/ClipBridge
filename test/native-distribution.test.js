import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fetchPinnedSource, sourceFilename, assertSourceCoverage } from '../scripts/fetch-native-sources.js';
import { applyNativeOverride, assertX64Library } from '../src/native-override.js';
import { sealCandidate } from '../src/package-files.js';
import { verifyRelease } from '../src/release-store.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('source coverage rejects a missing or mismatched runtime even with native sources and recipes present', () => {
  const native = { sha256: 'a'.repeat(64), url: 'https://example.invalid/native.tar.xz' };
  const runtime = { sha256: 'b'.repeat(64), url: 'https://example.invalid/runtime.tar.xz' };
  const recipe = { commit: 'c'.repeat(40), repository: 'https://example.invalid/recipe.git' };
  const lock = { artifacts: [native], runtimeArtifacts: [runtime], recipes: { example: recipe } };
  assert.throws(() => assertSourceCoverage(lock, { artifacts: [native, recipe] }), /compiler-runtime/);
  assert.throws(() => assertSourceCoverage(lock, { artifacts: [native, recipe, { ...runtime, sha256: 'd'.repeat(64) }] }), /compiler-runtime/);
  assert.doesNotThrow(() => assertSourceCoverage(lock, { artifacts: [native, recipe, runtime] }));
  assert.throws(() => assertSourceCoverage(lock, { artifacts: [native, runtime] }), /build recipe/);
});
async function fixture(t) { const root = await mkdtemp(path.join(os.tmpdir(),'ClipBridge-native-source-')); t.after(() => rm(root,{recursive:true,force:true})); return root; }
function pe(value) { const bytes = Buffer.alloc(256,value); bytes.write('MZ'); bytes.writeUInt32LE(64,60); bytes.writeUInt32LE(0x4550,64); bytes.writeUInt16LE(0x8664,68); bytes.writeUInt16LE(0x2000,86); return bytes; }
test('source delivery uses pinned bytes and rejects bad cache, insecure origins and mismatch',async t => {
  const root = await fixture(t), content = Buffer.from('synthetic source');
  const item = {name:'demo',version:'1.0',sha256:hash(content),url:'https://example.invalid/demo.tar.gz'};
  await fetchPinnedSource(item,root,async()=>new Response(content));
  await fetchPinnedSource(item,root,async()=>{throw new Error('cache should be used');});
  assert.throws(()=>sourceFilename({...item,url:'http://example.invalid/demo.tar.gz'}));
  assert.throws(()=>sourceFilename({...item,name:'../escape'}));
  await writeFile(path.join(root,sourceFilename(item)),'tampered');
  await assert.rejects(fetchPinnedSource(item,root),/Cached source hash mismatch/);
  await assert.rejects(fetchPinnedSource({...item,name:'bad'},root,async()=>new Response('bad')),/hash mismatch/);
  await assert.rejects(fetchPinnedSource({...item,name:'redirect'},root,async()=>new Response(null,{status:302,headers:{location:'http://example.invalid/a.tar.gz'}})),/Insecure/);
});
test('owner library replacement seals new hashes only in fresh staging and preserves originals',async t => {
  const root=await fixture(t), app=path.join(root,'build/candidate-11111111-1111-1111-1111-111111111111/payload/app'), input=path.join(root,'rebuilt');
  const library='libvips-42.dll', target=path.join(app,'node_modules/@img/sharp-win32-x64/lib',library);
  await mkdir(path.dirname(target),{recursive:true}); await mkdir(input);
  const original=pe(0), replacement=pe(1); await writeFile(target,original); await writeFile(path.join(input,library),replacement);
  const report=await applyNativeOverride(root,app,input);
  assert.equal(report.files[0].originalSHA256,hash(original)); assert.equal(report.files[0].replacementSHA256,hash(replacement));
  assert.equal(report.compatibilityTested,false); assert.deepEqual(await readFile(path.join(input,library)),replacement);
  const payload=path.dirname(app), sealed=await sealCandidate(payload,{version:'1.1.0',commit:'a'.repeat(40)});
  await verifyRelease(payload,sealed.hash);
  await assert.rejects(applyNativeOverride(root,path.join(root,'Programs/ClipBridge/app'),input),/fresh/);
  await writeFile(path.join(input,'unapproved.dll'),replacement); await assert.rejects(applyNativeOverride(root,app,input),/only explicitly/);
  await writeFile(target,original); await assert.rejects(verifyRelease(payload,sealed.hash),/integrity/);
});
test('native replacement rejects non-x64, executable and linked library input',async t=>{
  assert.throws(()=>assertX64Library(Buffer.from('not executable')));
  const x86=pe(0); x86.writeUInt16LE(0x14c,68); assert.throws(()=>assertX64Library(x86));
  const exe=pe(0); exe.writeUInt16LE(0,86); assert.throws(()=>assertX64Library(exe));
  const root=await fixture(t), app=path.join(root,'build/candidate-11111111-1111-1111-1111-111111111111/payload/app');
  await mkdir(app,{recursive:true}); const real=path.join(root,'real'); await mkdir(real);
  await symlink(real,path.join(root,'linked'),'junction'); await assert.rejects(applyNativeOverride(root,app,path.join(root,'linked')),/Linked/);
});
