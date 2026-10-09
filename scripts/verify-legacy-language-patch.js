import { mkdtemp, readFile, copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createHistory } from '../src/history.js';
import { createTestSystem } from '../test/support/desktop-system.js';
const source = fileURLToPath(new URL('../',import.meta.url));
// Synthetic complete environment; no installed config/token/history or OS actions.
export async function verifyLegacyLanguagePatch(patch) {
  const root=await mkdtemp(path.join(source,'build','legacy-language-test-'));let desktop,phone;
  try {
    const manifest=JSON.parse(await readFile(path.join(source,'source-manifest.json'),'utf8'));
    for(const name of manifest.files.filter(name=> /^(src|desktop|locales|scripts)\//.test(name))) {
      await mkdir(path.dirname(path.join(root,name)),{recursive:true});await copyFile(path.join(source,name),path.join(root,name));
    }
    for(const name of ['src/desktop-server.js','src/app.js'])await copyFile(path.join(patch,'app',name),path.join(root,name));
    const data=path.join(root,'data');await mkdir(data);
    const history=await createHistory(data);
    const content='İstanbul — unchanged synthetic language test';
    const id=await history.record({type:'text',content},'inbound');
    const config={configPath:path.join(data,'config.json'),token:'synthetic-only-token'};
    const {createDesktopServer}=await import(pathToFileURL(path.join(root,'src/desktop-server.js')));
    desktop=await createDesktopServer({config,history,system:createTestSystem(),transfers:{getItem:async()=>({type:'text',content})},localNetwork:{status:()=>({configured:true,state:'ready',endpoint:'https://demo.example.invalid:32147/api/v1/clipboard'})}});
    const {createServer}=await import(pathToFileURL(path.join(root,'src/app.js')));
    phone=createServer({token:config.token,getLanguage:()=>config.preferences.get().language,getClipboard:async()=>content,setClipboard:async()=>{},logger:{info(){},error(){}}});
    for(const server of [desktop,phone])await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin='http://127.0.0.1:'+desktop.address().port, phoneOrigin='http://127.0.0.1:'+phone.address().port;
    const token=await readFile(path.join(data,'desktop-token'),'utf8'),headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    assert.equal((await(await fetch(origin+'/api/state',{headers})).json()).preferences.language,'tr');
    assert.equal((await fetch(origin+'/api/settings',{method:'POST',headers,body:JSON.stringify({language:'en'})})).status,200);
    assert.equal(history.detail(id).content,content);
    assert.equal(JSON.parse(await readFile(path.join(data,'ui-settings.json'),'utf8')).language,'en');
    assert.match(await(await fetch(phoneOrigin+'/setup')).text(),/Copy authorization/);
    assert.equal(await(await fetch(phoneOrigin+'/api/v1/clipboard',{headers:{Authorization:'Bearer '+config.token}})).text(),content);
    assert.match((await(await fetch(phoneOrigin+'/api/v1/clipboard')).json()).message,/access key is missing or invalid/);
    const guide=await(await fetch(origin+'/api/local-setup',{headers})).json();assert.equal(guide.url,'https://demo.example.invalid:32147/local-setup');
    console.log('Legacy synthetic HTTP language/content/authorization/local guide PASS.');
  } finally {
    for(const server of [desktop,phone].filter(Boolean)){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    await rm(root,{recursive:true,force:true});
  }
}
