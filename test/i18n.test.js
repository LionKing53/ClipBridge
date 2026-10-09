import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { messages, errorMessages, createPreferences, translate, normalizeLanguage } from '../src/i18n.js';
import { publicFailure } from '../src/errors.js';
import { createServer } from '../src/app.js';
import { createDesktopServer } from '../src/desktop-server.js';
import { createHistory } from '../src/history.js';
import { createTestSystem } from './support/desktop-system.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

test('catalogs cover owned browser/native references with matching interpolation fields', async () => {
  const native = JSON.parse(await readFile(new URL('../locales/native.json',import.meta.url),'utf8'));
  for (const [key,value] of Object.entries({...messages,...errorMessages,...native})) {
    assert.equal(typeof value.tr,'string',key); assert.ok(value.tr.trim(),key);
    assert.equal(typeof value.en,'string',key); assert.ok(value.en.trim(),key);
    const fields = text => [...text.matchAll(/\{([a-z]+)\}/g)].map(x=>x[1]).sort();
    assert.deepEqual(fields(value.tr),fields(value.en),key);
  }
  for (const file of ['desktop/app.js','desktop/index.html','desktop/theme.js','launcher/Setup.cs','launcher/DesktopWindow.cs','launcher/PanoKopru.cs','src/app.js','src/local-network.js','src/pair.js']) {
    const source=await readFile(new URL('../'+file,import.meta.url),'utf8');
    for(const [,key] of source.matchAll(/(?:\bt\('|Language.Text\("|data-i18n(?:-[a-z-]+)?=")([a-zA-Z0-9_.]+)/g)) assert.ok(messages[key]||native[key],file+': '+key);
  }
});
test('native launcher/installer share saved language and preserve other preferences', {skip:process.platform!=='win32'}, async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'PanoKopru-language-native-')), run=promisify(execFile);
  try {
    const exe=path.join(root,'LanguageProbe.exe'), source=fileURLToPath(new URL('../',import.meta.url));
    await run(path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:exe','/reference:System.Web.Extensions.dll','/reference:System.Windows.Forms.dll','/out:'+exe,
      ...['messages','native','errors'].map((name,i)=>'/resource:'+path.join(source,'locales',name+'.json')+','+['Messages','NativeMessages','ErrorMessages'][i]),path.join(source,'launcher/Language.cs'),path.join(source,'test/support/LanguageProbe.cs')],{windowsHide:true});
    assert.equal((await run(exe,[path.join(root,'data')],{windowsHide:true})).stdout.trim(),'native-language PASS');
  }finally{await rm(root,{recursive:true,force:true});}
});
test('native setup TR/EN form renders without horizontal overflow and without invoking OS adapters', {skip:process.platform!=='win32'}, async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'PanoKopru-setup-language-')), run=promisify(execFile);
  try {
    const source=fileURLToPath(new URL('../',import.meta.url)), exe=path.join(root,'SetupLanguageProbe.exe');
    await run(path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:exe','/main:SetupLanguageProbe','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll','/reference:System.Windows.Forms.dll','/out:'+exe,
      ...['messages','native','errors'].map((name,i)=>'/resource:'+path.join(source,'locales',name+'.json')+','+['Messages','NativeMessages','ErrorMessages'][i]),
      ...['launcher/Setup.cs','launcher/Language.cs','launcher/FreshInstall.cs','launcher/RemoveInstall.cs','launcher/WindowsFreshInstall.cs','launcher/InstalledLaunch.cs','scripts/InstallProbe.cs','test/support/SetupLanguageProbe.cs'].map(name=>path.join(source,name))],{windowsHide:true});
    assert.equal((await run(exe,[root],{windowsHide:true,timeout:15000})).stdout.trim(),'setup-language-layout PASS');
    // Retain only synthetic form images in ignored build for visual review.
    const {mkdir,copyFile}=await import('node:fs/promises');await mkdir(path.join(source,'build'),{recursive:true});
    for(const language of ['tr','en'])await copyFile(path.join(root,'setup-'+language+'.png'),path.join(source,'build','native-setup-'+language+'.png'));
  }finally{await rm(root,{recursive:true,force:true});}
});
test('language defaults distinguish existing users and new system languages; preferences persist without changing other fields', async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'PanoKopru-language-'));
  try {
    assert.equal((await createPreferences(path.join(root,'old'),{existing:true,systemLocale:'en-US'})).get().language,'tr');
    assert.equal((await createPreferences(path.join(root,'new'),{existing:false,systemLocale:'de-DE'})).get().language,'en');
    assert.equal((await createPreferences(path.join(root,'turkish'),{existing:false,systemLocale:'tr-TR'})).get().language,'tr');
    const file=path.join(root,'ui-settings.json');await writeFile(file,JSON.stringify({language:'tr',theme:'light',other:42}));
    const prefs=await createPreferences(root);await prefs.set('en');
    assert.equal((await createPreferences(root)).get().language,'en');
    assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{language:'en',theme:'light',other:42});
    assert.throws(()=>prefs.set('fr'),/Invalid language/);
    assert.equal(normalizeLanguage('TR_tr'),'tr');
    assert.equal(publicFailure({code:'ENOSPC'},undefined,'en').body.error,'disk_full');
    assert.match(publicFailure({code:'ENOSPC'},undefined,'en').body.message,/disk space/);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('desktop preference changes persist and phone pairing follows language without changing content or protocol', async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),'PanoKopru-language-http-'));let desktop,phone;
  try {
    const preferences=await createPreferences(root);
    const history=await createHistory(root);
    const content='İstanbul — kullanıcı içeriği / English';const id=await history.record({type:'text',content},'inbound');
    const config={configPath:path.join(root,'config.json'),token:'isolated-language-test',preferences};
    desktop=await createDesktopServer({config,history,system:createTestSystem(),transfers:{getItem:async()=>({type:'text',content})}});
    phone=createServer({token:config.token,getLanguage:()=>preferences.get().language,getClipboard:async()=>content,setClipboard:async()=>{},logger:{info(){},error(){}}});
    for(const server of [desktop,phone])await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin='http://127.0.0.1:'+desktop.address().port,phoneOrigin='http://127.0.0.1:'+phone.address().port;
    const token=await readFile(path.join(root,'desktop-token'),'utf8');
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    let response=await fetch(origin+'/api/settings',{method:'POST',headers,body:JSON.stringify({language:'en'})});assert.equal(response.status,200);
    assert.equal((await createPreferences(root)).get().language,'en');
    const page=await(await fetch(phoneOrigin+'/setup')).text();assert.match(page,/<html lang="en">/);assert.match(page,/Copy authorization/);assert.ok(!page.includes('Yetkilendirmeyi kopyala'));
    response=await fetch(phoneOrigin+'/api/v1/clipboard',{headers:{Authorization:'Bearer '+config.token}});assert.equal(await response.text(),content);
    assert.equal(history.detail(id).content,content);
    response=await fetch(origin+'/api/settings',{method:'POST',headers,body:JSON.stringify({language:'fr'})});assert.equal(response.status,400);assert.equal(preferences.get().language,'en');
    await fetch(origin+'/api/settings',{method:'POST',headers,body:JSON.stringify({language:'tr'})});
    assert.match(await(await fetch(phoneOrigin+'/setup')).text(),/Yetkilendirmeyi kopyala/);
  }finally{await Promise.all([desktop,phone].filter(Boolean).map(s=>s.closeAndDrain()));await rm(root,{recursive:true,force:true});}
});
