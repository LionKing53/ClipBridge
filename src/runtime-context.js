import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, lstat, readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const DATA_SCHEMA = 1;
export const productionPorts = Object.freeze({ api: 32145, desktop: 32146, local: 32147 });
export const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const fail = (message, code = 'ERR_RUNTIME_CONTEXT') => Object.assign(new Error(message), { code });
const verifiedContexts = new WeakSet();
export function assertRuntimeContext(context) { if (!verifiedContexts.has(context)) throw fail('Runtime context must come from the validated resolver.'); }
const normalized = value => path.resolve(value).replace(/[\\/]+$/, '').toLowerCase();
export const within = (root, candidate) => normalized(candidate) === normalized(root) || normalized(candidate).startsWith(normalized(root) + path.sep);

export function resolveRuntime({ env = process.env, checkout = existsSync(new URL('../SOURCE-CHECKOUT', import.meta.url)), projectRoot = sourceRoot } = {}) {
  const mode = env.PANOKOPRU_MODE;
  if (!['production', 'development', 'test'].includes(mode)) throw fail('Explicit PANOKOPRU_MODE is required; no personal-data fallback.');
  if (checkout && mode === 'production') throw fail('Production is blocked in a source checkout.', 'ERR_SOURCE_CHECKOUT');
  if (!env.LOCALAPPDATA || !path.isAbsolute(env.LOCALAPPDATA)) throw fail('LOCALAPPDATA is required.');
  const personal = path.join(env.LOCALAPPDATA, 'PanoKopru');
  const install = path.join(env.LOCALAPPDATA, 'Programs', 'PanoKopru');
  const dataRoot = env.PANOKOPRU_DATA_ROOT || (mode === 'production' ? personal : null);
  if (!dataRoot || !path.isAbsolute(dataRoot) || /[\x00-\x1f"<>|]/.test(dataRoot)) throw fail('An absolute, explicit data root is required.');
  const root = path.resolve(dataRoot);
  if (root.startsWith('\\\\') || root.startsWith('//')) throw fail('Network data roots are not supported.');
  if (within(root, personal) || within(install, root) || within(root, install) || within(root, projectRoot)) {
    if (!(mode === 'production' && normalized(root) === normalized(personal))) throw fail('Data root overlaps a protected installation or parent directory.');
  }
  if (mode !== 'production' && within(personal, root)) throw fail('Development cannot use personal data.');
  if (mode === 'production' && normalized(root) !== normalized(personal)) throw fail('Production data root must be the per-user PanoKopru directory.');
  if (within(projectRoot, root) && !within(path.join(projectRoot, '.local'), root)) throw fail('Source-local data must be under ignored .local.');
  const ports = {};
  for (const [name, normal] of Object.entries(productionPorts)) {
    const value = env['PANOKOPRU_' + name.toUpperCase() + '_PORT'] || (mode === 'production' ? String(normal) : '');
    if (!/^\d{1,5}$/.test(value) || Number(value) < 1024 || Number(value) > 65535) throw fail('Explicit valid unprivileged ports are required.');
    ports[name] = Number(value);
    if (mode === 'production' && ports[name] !== normal) throw fail('Production port changes require a coordinated installer migration.');
    if (mode !== 'production' && Object.values(productionPorts).includes(ports[name])) throw fail('Development ports must not overlap production.');
  }
  if (new Set(Object.values(ports)).size !== 3) throw fail('API, desktop and local ports must differ.');
  const instanceId = createHash('sha256').update(mode + '\n' + normalized(root)).digest('hex').slice(0, 24);
  const context = Object.freeze({ contextVersion: 1, mode, dataRoot: root, ports: Object.freeze(ports), instanceId, schemaVersion: DATA_SCHEMA });
  verifiedContexts.add(context);
  return context;
}

export async function assertNoLinks(target) {
  let current = path.resolve(target);
  while (true) {
    try { if ((await lstat(current)).isSymbolicLink()) throw fail('Linked data paths are not permitted.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
}

export async function prepareRuntime(context) {
  assertRuntimeContext(context);
  await assertNoLinks(context.dataRoot);
  await mkdir(context.dataRoot, { recursive: true });
  const schemaFile = path.join(context.dataRoot, 'data-schema.json');
  let schema;
  try { schema = JSON.parse(await readFile(schemaFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!schema) {
    if (existsSync(path.join(context.dataRoot, 'config.json'))) throw fail('Existing unversioned data requires explicit migration.', 'ERR_MIGRATION_REQUIRED');
    await writeFile(schemaFile, JSON.stringify({ version: DATA_SCHEMA, createdAt: new Date().toISOString() }) + '\n', { flag: 'wx' });
  } else if (schema.version !== DATA_SCHEMA) throw fail('Unsupported data schema; no automatic downgrade.', 'ERR_DATA_SCHEMA');
  const file = path.join(context.dataRoot, 'runtime-context.json');
  let previous;
  try { previous = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous && JSON.stringify(previous) !== JSON.stringify(context)) throw fail('Runtime identity or ports changed; explicit offline reconfiguration required.');
  if (!previous) await writeFile(file, JSON.stringify(context), { flag: 'wx' });
  return context;
}

export async function acquireInstance(context) {
  assertRuntimeContext(context);
  await assertNoLinks(context.dataRoot);
  await mkdir(context.dataRoot, { recursive: true });
  const file = path.join(context.dataRoot, 'instance.lock');
  const id = randomUUID();
  try { await writeFile(file, JSON.stringify({ id, pid: process.pid, instanceId: context.instanceId, startedAt: new Date().toISOString() }), { flag: 'wx' }); }
  catch (error) { if (error.code === 'EEXIST') throw fail('Instance is running or requires reviewed crash recovery; lock was not stolen.', 'ERR_INSTANCE_LOCKED'); throw error; }
  return async () => {
    const saved = JSON.parse(await readFile(file, 'utf8'));
    if (saved.id !== id) throw fail('Instance lock ownership changed.');
    await unlink(file);
  };
}
