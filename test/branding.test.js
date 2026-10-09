import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { resolveRuntime, sourceRoot } from '../src/runtime-context.js';
import { readLocalCertificate } from '../src/local-network.js';
import { rebrandLegacyLabel } from '../scripts/legacy-language-adapter.js';
import vm from 'node:vm';
import { translateMessage } from '../src/i18n.js';

test('ClipBridge is the same visible brand in both languages and native metadata', async () => {
  for (const file of ['locales/messages.json','locales/native.json','desktop/index.html','launcher/ClipBridge.cs','launcher/DesktopWindow.cs','launcher/Setup.cs']) {
    const text = await readFile(path.join(sourceRoot,file),'utf8');
    assert.doesNotMatch(text,/PanoKöprü|PanoK\\u00f6pr\\u00fc/);
    assert.match(text,/ClipBridge/);
  }
  const pkg = JSON.parse(await readFile(path.join(sourceRoot,'package.json'),'utf8'));
  const lock = JSON.parse(await readFile(path.join(sourceRoot,'package-lock.json'),'utf8'));
  assert.equal(pkg.name,'clipbridge'); assert.equal(lock.name,pkg.name); assert.equal(lock.version,pkg.version);
  assert.equal(rebrandLegacyLabel('PanoKöprü - arka planda hazır'),'ClipBridge - arka planda hazır');
  assert.equal(translateMessage('PanoKöprü Windows izinlerini temizle','en'),'Remove ClipBridge Windows permissions');
  assert.equal(translateMessage('My PanoKöprü project notes','en'),'My PanoKöprü project notes');
});

test('renamed theme key honors an old preference without overwriting it or a new preference', async () => {
  const code = (await readFile(path.join(sourceRoot,'desktop/theme.js'),'utf8')).replace("import { t } from './i18n.js';",'');
  for (const [current,expected] of [[undefined,'light'],['dark','dark']]) {
    const values = new Map([['panokopru-theme','light']]); if(current)values.set('clipbridge-theme',current);
    const document={documentElement:{dataset:{}},querySelector:()=>null};
    vm.runInNewContext(code,{t:()=>'',document,window:{},localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}});
    assert.equal(document.documentElement.dataset.theme,expected);
    assert.equal(values.get('clipbridge-theme'),expected); assert.equal(values.get('panokopru-theme'),'light');
  }
});

test('new runtime cannot enter old personal data, program roots or ancestors', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(),'ClipBridge-brand-boundary-'));
  t.after(()=>rm(temp,{recursive:true,force:true}));
  const local = path.join(temp,'Local');
  const env = { LOCALAPPDATA:local, CLIPBRIDGE_MODE:'test', CLIPBRIDGE_DATA_ROOT:path.join(temp,'isolated'), CLIPBRIDGE_API_PORT:'44145',CLIPBRIDGE_DESKTOP_PORT:'44146',CLIPBRIDGE_LOCAL_PORT:'44147' };
  for (const relative of ['PanoKopru','PanoKopru/child','Programs/PanoKopru','Programs/PanoKopru/app']) {
    assert.throws(()=>resolveRuntime({env:{...env,CLIPBRIDGE_DATA_ROOT:path.join(local,relative)}}),/protected legacy/);
  }
  assert.throws(()=>resolveRuntime({env:{...env,CLIPBRIDGE_DATA_ROOT:local}}),/protected legacy/);
  assert.equal(resolveRuntime({env:{LOCALAPPDATA:local,CLIPBRIDGE_MODE:'production'},checkout:false}).dataRoot,path.join(local,'ClipBridge'));
});

test('certificate compatibility reads an old public file without replacing or regenerating identity', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(),'ClipBridge-public-ca-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const old = path.join(root,'PanoKopru-Local-CA.cer'), current=path.join(root,'ClipBridge-Local-CA.cer');
  await writeFile(old,'synthetic-old-public-cert');
  assert.equal((await readLocalCertificate(root)).toString(),'synthetic-old-public-cert');
  await writeFile(current,'synthetic-new-public-cert');
  assert.equal((await readLocalCertificate(root)).toString(),'synthetic-new-public-cert');
  await rm(current); await mkdir(current);
  await assert.rejects(readLocalCertificate(root)); // Do not mask corrupt/unreadable new identity.
  assert.equal(await readFile(old,'utf8'),'synthetic-old-public-cert');
});
