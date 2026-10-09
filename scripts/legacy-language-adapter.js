// Narrow, hash-pinned language adapter; not a legacy data migration or updater.
// Program sources only. Never reads config, history, certificates or private data.
import { createHash } from 'node:crypto';
export const legacyInputs = {
  'src/desktop-server.js': 'c4dff7abfb37fe2078b895aea8eb6571ea1fff436fe637db059a0687d017da8a',
  'src/server.js': 'b994fda4c6d446953f603527ba754902defcf1a23dde4e6ba1b2c5308f5a2f31',
  'src/app.js': '63a14376c60d78defc78b91cd4207f88cf37aabe3096178165c6a998315a86a3',
  'src/local-network.js': '7ef24e2c9f6ffce852ae44440f32f0636e16c8eed38d1f368d0c629353c55d17',
  'launcher/PanoKopru.cs': 'd65c7b07faec52de24224fc2015fee124b7880cc14690335befc5eb895d24308',
  'launcher/DesktopWindow.cs': '7f202552dff93aab3a49adef8eb14c43eeb33b1491353475fbca8c8927d0699c'
};
export function replaceOnce(source, before, after) {
  const at = source.indexOf(before);
  if (at < 0 || source.indexOf(before, at + before.length) >= 0) throw new Error('Legacy language adapter shape mismatch');
  return source.slice(0, at) + after + source.slice(at + before.length);
}
function section(source, from, to) {
  const a = source.indexOf(from), b = source.indexOf(to, a + from.length);
  if (a < 0 || b < 0) throw new Error('Missing reviewed language section');
  return source.slice(a,b);
}
export function adaptLegacy(inputs, canonical, nativeCatalog) {
  for (const [name, hash] of Object.entries(legacyInputs)) {
    if (createHash('sha256').update(inputs[name] || '').digest('hex') !== hash) throw new Error('Unreviewed legacy program source: ' + name);
  }
  const out = Object.fromEntries(Object.entries(inputs).map(([name, text]) => [name,text.replace(/\r\n/g,'\n')]));
  out['src/server.js'] = replaceOnce(out['src/server.js'], '  token: config.token,', "  token: config.token,\n  getLanguage: () => config.preferences?.get().language || 'tr',");
  let desktop = out['src/desktop-server.js'];
  desktop = replaceOnce(desktop, 'export async function createDesktopServer({ config, history, transfers, diagnostics = () => [], localNetwork }) {',
    section(canonical.desktop,'const defaultSystem = {','const writeJson =') + 'export async function createDesktopServer({ config, history, transfers, diagnostics = () => [], localNetwork, system = defaultSystem }) {\n  for (const key of Object.keys(defaultSystem)) if (typeof system[key] !== "function") throw new Error("Incomplete desktop system adapter");');
  desktop = replaceOnce(desktop, section(desktop,"      const { stdout } = await run(tailscale",'    } catch'), '      networkCache = await system.network();\n');
  desktop = replaceOnce(desktop,'machine: os.hostname()','machine: system.hostname()');
  desktop = replaceOnce(desktop,'await setWindowsClipboard(item.content);','await system.copyText(item.content);');
  desktop = replaceOnce(desktop,"await run('explorer.exe', ['/select,', item.source], { windowsHide: true }).catch(() => {});",'await system.reveal(item.source);');
  desktop = desktop.replaceAll('await setWindowsClipboardImageAndFile(png, item.source)','await system.copyImageAndFile(png, item.source)').replaceAll('await setWindowsClipboardFiles([item.source])','await system.copyFiles([item.source])');
  desktop = "import { createPreferences, messages, errorMessages, translateMessage } from './i18n.js';\nimport { publicFailure } from './errors.js';\n" + desktop;
  desktop = replaceOnce(desktop, 'const json = (res, status, value)', 'const writeJson = (res, status, value)');
  desktop = replaceOnce(desktop, '  const token = randomBytes(32)', `  const preferences = await createPreferences(path.dirname(config.configPath));
  config.preferences = preferences;
  const json = (res, status, value) => {
    const language = preferences.get().language;
    if (value.message) value = { ...value, message: translateMessage(value.message, language) };
    if (value.error && !value.message) {
      const message = translateMessage(value.error, language);
      value = { ...value, message: message !== value.error ? message : publicFailure({ statusCode: status }, undefined, language).body.message };
    }
    writeJson(res, status, value);
  };
  const token = randomBytes(32)`);
  desktop = replaceOnce(desktop, "'/app.js': ['app.js', 'text/javascript'],", "'/app.js': ['app.js', 'text/javascript'], '/i18n.js': ['i18n.js', 'text/javascript'], '/setup.css': ['setup.css', 'text/css'],");
  desktop = replaceOnce(desktop, "      if (req.method === 'GET' && files[url.pathname])", "      if (req.method === 'GET' && url.pathname === '/translations.json') return json(res, 200, { ...messages, ...errorMessages });\n      if (req.method === 'GET' && files[url.pathname])");
  desktop = replaceOnce(desktop, "version: '1.0'", "version: '1.2.0', preferences: preferences.get()");
  desktop = replaceOnce(desktop, "await history.settings(await body(req));", "const input = await body(req); if (Object.hasOwn(input, 'language')) await preferences.set(input.language); if (Object.hasOwn(input,'enabled') || Object.hasOwn(input,'limit')) await history.settings(input);");
  for (const [a,b] of [["      if (req.method === 'GET' && url.pathname === '/api/local-setup')", "      if (req.method === 'POST' && url.pathname === '/api/local-permission')"], ["      if (req.method === 'GET' && url.pathname === '/api/pairing')", "      if (req.method === 'POST' && url.pathname === '/api/capture')"]]) {
    desktop = replaceOnce(desktop, section(desktop,a,b), section(canonical.desktop,a,b));
  }
  desktop = "import { operationError } from './errors.js';\n" + desktop;
  out['src/desktop-server.js'] = desktop;
  let app = out['src/app.js'];
  app = "import { translate, translateMessage } from './i18n.js';\nimport { publicFailure } from './errors.js';\n" + app;
  app = replaceOnce(app, 'function json(response, statusCode, body)', 'function writeJson(response, statusCode, body)');
  app = replaceOnce(app, section(app,'function setupPage(', 'function isAuthorized('), section(canonical.app,'function setupPage(', 'function isAuthorized('));
  app = replaceOnce(app,'  token,',"  token,\n  getLanguage = () => 'tr',");
  app = replaceOnce(app,'  const receiveItem =',`  const json = (response, status, body) => {
    if (body.error) body = { ...body, message: translateMessage(body.error, getLanguage()) !== body.error ? translateMessage(body.error, getLanguage()) : publicFailure({ statusCode: status }, body.error, getLanguage()).body.message };
    writeJson(response,status,body);
  };
  const receiveItem =`);
  app = replaceOnce(app,'setupPage(response);','setupPage(response, getLanguage());');
  out['src/app.js'] = app;
  let local = out['src/local-network.js'];
  local = "import { translate } from './i18n.js';\n" + local;
  local = replaceOnce(local,'    async handleSetup(req, res) {',"    async handleSetup(req, res) {\n      const language = apiOptions.getLanguage?.() || 'tr';\n      const t = (key, values) => translate(key, language, values);");
  const html = /res\.end\(`<!doctype html>[\s\S]*?<\/html>`\);/;
  if (!html.test(local) || !html.test(canonical.local)) throw new Error('Missing reviewed local guide');
  local = local.replace(html, canonical.local.match(html)[0]);
  out['src/local-network.js'] = local;
  const native = new Map(Object.entries(nativeCatalog).map(([key,value]) => [value.tr,key]));
  for (const name of ['launcher/PanoKopru.cs','launcher/DesktopWindow.cs']) {
    // Only exact catalog-owned literals; brand, paths, mutexes, tokens untouched.
    out[name] = out[name].replace(/"(?:[^"\\]|\\.)*"/g, literal => {
      let value; try { value = JSON.parse(literal); } catch { return literal; }
      return native.has(value) ? 'Language.Text(' + JSON.stringify(native.get(value)) + ')' : literal;
    }).replace(/AssemblyVersion\("1\.0\.0\.0"\)/,'AssemblyVersion("1.2.0.0")').replace(/AssemblyFileVersion\("1\.0\.0\.0"\)/,'AssemblyFileVersion("1.2.0.0")');
  }
  out['launcher/PanoKopru.cs'] = replaceOnce(out['launcher/PanoKopru.cs'], '        bool background =', '        Language.Initialize(Path.Combine(AppRoot, ".clipboard-bridge"), true);\n        bool background =');
  out['launcher/DesktopWindow.cs'] = replaceOnce(out['launcher/DesktopWindow.cs'], '                    if (message != "theme:dark"', `                    if (message == "language:tr" || message == "language:en") {
                        Language.Current = message.Substring(9);
                        tray.Text = Language.Text("m_ed4706210b2f");
                        Language.RefreshMenu(tray.ContextMenuStrip);
                        return;
                    }
                    if (message != "theme:dark"`);
  return out;
}
