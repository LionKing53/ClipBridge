// File-only owner-authorized compatibility artifact, never install or launch.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacyInputs, adaptLegacy } from './legacy-language-adapter.js';
import { assertNoLinks } from '../src/runtime-context.js';
import { verifyLegacyLanguagePatch } from './verify-legacy-language-patch.js';
const run = promisify(execFile), root = fileURLToPath(new URL('../',import.meta.url));
const appRoot = process.argv[2] && path.resolve(process.argv[2]);
const native = process.argv[3] && path.resolve(process.argv[3]);
if (process.platform !== 'win32' || !appRoot || path.basename(appRoot) !== 'app' || !native || !native.startsWith(path.join(root,'build','native-'))) throw new Error('Explicit reviewed legacy app and compile-only native artifact required.');
await assertNoLinks(appRoot); await assertNoLinks(native);
const inputs = {};
for (const name of Object.keys(legacyInputs)) inputs[name] = await readFile(path.join(appRoot,name),'utf8');
const canonical = {};
for (const [key,name] of Object.entries({app:'src/app.js',local:'src/local-network.js',desktop:'src/desktop-server.js'})) canonical[key] = await readFile(path.join(root,name),'utf8');
const output = path.join(root,'build','legacy-language-' + randomUUID());
await mkdir(output);
// Keep the installed SDK/runtime unchanged. A newer strong-named SDK reference
// cannot be satisfied by the legacy installation's older assemblies.
const legacyLibraries = {
  'Microsoft.Web.WebView2.Core.dll':'e6f54c8ce208e3797c427d01ad671b47cb25abc85604753d6ec2546d0ffef550',
  'Microsoft.Web.WebView2.WinForms.dll':'cc3d2937c350a4f5e20399855bcab4fe695a395308feb2ed67394faa6a1ae849'
};
for (const [name,hash] of Object.entries(legacyLibraries)) {
  const file=path.join(path.dirname(appRoot),name); await assertNoLinks(file);
  if(createHash('sha256').update(await readFile(file)).digest('hex')!==hash)throw new Error('Unreviewed legacy WebView SDK library');
}
const patched = adaptLegacy(inputs,canonical,JSON.parse(await readFile(path.join(root,'locales/native.json'),'utf8')));
const files = {};
async function put(name,buffer) {
  const target = path.join(output,name); await mkdir(path.dirname(target),{recursive:true}); await writeFile(target,buffer,{flag:'wx'});
  files[name] = createHash('sha256').update(buffer).digest('hex');
}
for (const [name,text] of Object.entries(patched)) await put('app/' + name,text);
for (const name of ['desktop/app.js','desktop/index.html','desktop/style.css','desktop/theme.js','desktop/theme.css','desktop/setup.css','desktop/i18n.js','src/i18n.js','src/errors.js','locales/messages.json','locales/errors.json','locales/native.json','launcher/Language.cs']) await put('app/' + name,await readFile(path.join(root,name)));
for (const name of Object.keys(files).filter(name=>name.endsWith('.js'))) await run(process.execPath,['--check',path.join(output,name)],{windowsHide:true});
const exe = path.join(output,'PanoKopru.exe');
await run(path.join(process.env.SystemRoot,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:winexe','/platform:x64',
  '/win32manifest:' + path.join(root,'launcher/app.manifest'),'/win32icon:' + path.join(native,'PanoKopru.ico'),
  '/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Web.Extensions.dll',
  ...['Core','WinForms'].map(name=>'/reference:' + path.join(path.dirname(appRoot),`Microsoft.Web.WebView2.${name}.dll`)),
  ...['messages','native','errors'].map((name,i)=>'/resource:' + path.join(root,'locales',name+'.json') + ',' + ['Messages','NativeMessages','ErrorMessages'][i]),
  '/out:' + exe,...['PanoKopru','DesktopWindow','Language'].map(name=>path.join(output,'app/launcher',name+'.cs'))],{windowsHide:true,timeout:60000});
files['PanoKopru.exe'] = createHash('sha256').update(await readFile(exe)).digest('hex');
await verifyLegacyLanguagePatch(output);
const commit = (await run('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true})).stdout.trim();
const dirty = !!(await run('git',['status','--porcelain'],{cwd:root,windowsHide:true})).stdout.trim();
await writeFile(path.join(output,'language-patch.json'),JSON.stringify({format:1,version:'1.2.0',purpose:'owner-authorized-language-only-legacy-patch',commit,dirty,inputs:legacyInputs,requiredInstalledLibraries:legacyLibraries,files,dataMigration:false,installed:false},null,2));
console.log('Legacy language patch compile/check PASS: ' + path.relative(root,output));
console.log('No private state read, no executable launched or installation changed.');
