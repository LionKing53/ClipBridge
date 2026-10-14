import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sourceRoot } from '../src/runtime-context.js';
const run = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('embedded installer extraction and recovery use only synthetic temp payloads and adapters', {skip:process.platform!=='win32',timeout:60000}, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(),'ClipBridge-embedded-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const exe = path.join(root,'EmbeddedPayloadProbe.exe');
  await run(path.join(process.env.SystemRoot,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),[
    '/nologo','/target:exe','/main:EmbeddedPayloadProbe','/reference:System.Web.Extensions.dll','/reference:System.IO.Compression.dll','/out:'+exe,
    ...['launcher/EmbeddedPayload.cs','launcher/InstalledLaunch.cs','launcher/FreshInstall.cs','launcher/RemoveInstall.cs','test/support/FreshInstallProbe.cs','test/support/EmbeddedPayloadProbe.cs'].map(name=>path.join(sourceRoot,name))
  ],{windowsHide:true});
  let count=0;
  async function probe(scenario){
    const fixture=path.join(root,String(++count)), payload=path.join(fixture,'payload');
    const names=['ClipBridge.exe','runtime/node.exe','app/src/server.js','Microsoft.Web.WebView2.Core.dll','Microsoft.Web.WebView2.WinForms.dll','WebView2Loader.dll','licenses/LICENSE','licenses/SOURCE-PACKAGE.json'];
    const bytes=Buffer.from('synthetic non-executable fixture');
    for(const name of names){const file=path.join(payload,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);}
    const manifest=JSON.stringify({format:1,version:'1.2.2',commit:'a'.repeat(40),schemaMin:1,schemaMax:1,files:names.map(name=>({path:name,bytes:scenario==='excessive-size'?3*1024**3:bytes.length,sha256:hash(bytes)}))});
    await writeFile(path.join(payload,'release.json'),manifest);
    if(scenario==='stale-linked'){
      const foreign=path.join(fixture,'unrelated');await mkdir(foreign);await writeFile(path.join(foreign,'retained'),'untouched');
      await symlink(foreign,path.join(fixture,'linked'),'junction');
    }
    const result=JSON.parse((await run(exe,[fixture,hash(manifest),scenario],{windowsHide:true,timeout:15000})).stdout);
    if(scenario==='stale-linked')assert.equal(await readFile(path.join(fixture,'unrelated/retained'),'utf8'),'untouched');
    return result;
  }
  await t.test('standalone extraction verifies every file, installs/removes via unchanged synthetic transaction and preserves data',async()=>{
    for(const scenario of ['ok','install-remove']){const r=await probe(scenario);assert.equal(r.ok,true);assert.equal(r.cleaned,true);assert.equal(r.remnants,0);assert.equal(r.isolated,true);}
  });
  await t.test('bad archive/manifest, modified content, missing/unlisted files, traversal, ADS, absolute, duplicate and link/directory entries fail closed',async()=>{
    for(const scenario of ['bad-archive','bad-manifest','tamper','missing','unlisted','traversal','ads','absolute','duplicate','link','directory','reserved','excessive-size','write-failure']){
      const r=await probe(scenario);assert.equal(r.ok,false,scenario);assert.equal(r.error,'rejected',scenario);assert.equal(r.cleaned,true,scenario);assert.equal(r.remnants,0,scenario);
    }
  });
  await t.test('cancellation before or during extraction removes only owned temp bytes',async()=>{
    for(const scenario of ['cancel-before','cancel-during']){const r=await probe(scenario);assert.equal(r.error,'cancelled');assert.equal(r.remnants,0);}
  });
  await t.test('interrupted old extraction is recovered, active or foreign-owner directories are not claimed',async()=>{
    const dead=await probe('stale-dead');assert.equal(dead.stale,1);assert.equal(dead.remnants,0);
    for(const scenario of ['stale-active','stale-owner']){const r=await probe(scenario);assert.equal(r.stale,0,scenario);assert.equal(r.cleaned,true);}
  });
  await t.test('unknown files and linked remnants are preserved, never recursively followed',async()=>{
    for(const scenario of ['foreign-remnant','stale-linked']){const r=await probe(scenario);assert.equal(r.stale,0);assert.equal(r.cleaned,false);assert.equal(r.remnants,1);}
  });
});
