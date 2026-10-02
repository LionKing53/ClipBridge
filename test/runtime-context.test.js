import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { resolveRuntime, prepareRuntime, acquireInstance } from '../src/runtime-context.js';
import { loadConfig } from '../src/config.js';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'PanoKopru-context-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { LOCALAPPDATA: path.join(root, 'Local'), PANOKOPRU_MODE: 'test', PANOKOPRU_DATA_ROOT: path.join(root, 'test-data'), PANOKOPRU_API_PORT: '42145', PANOKOPRU_DESKTOP_PORT: '42146', PANOKOPRU_LOCAL_PORT: '42147' };
  return { root, env, context: resolveRuntime({ env }) };
}
test('runtime requires explicit mode, data root and non-production distinct ports', async t => {
  const { env } = await fixture(t);
  for (const change of [{ PANOKOPRU_MODE: '' }, { PANOKOPRU_DATA_ROOT: '' }, { PANOKOPRU_DATA_ROOT: 'relative' }, { PANOKOPRU_API_PORT: '' }, { PANOKOPRU_API_PORT: '32145' }, { PANOKOPRU_API_PORT: '42146' }, { PANOKOPRU_API_PORT: '42145junk' }]) assert.throws(() => resolveRuntime({ env: { ...env, ...change } }));
  assert.throws(() => resolveRuntime({ env: { ...env, PANOKOPRU_MODE: 'production' } }), { code: 'ERR_SOURCE_CHECKOUT' });
});
test('protected personal/install roots, ancestors and source directories are rejected', async t => {
  const { root, env } = await fixture(t);
  for (const target of [root, env.LOCALAPPDATA, path.join(env.LOCALAPPDATA, 'PanoKopru'), path.join(env.LOCALAPPDATA, 'PanoKopru', 'test'), path.join(env.LOCALAPPDATA, 'Programs', 'PanoKopru', 'app')]) assert.throws(() => resolveRuntime({ env: { ...env, PANOKOPRU_DATA_ROOT: target } }));
});
test('new context persists stable identity and token without CWD state', async t => {
  const { context, env } = await fixture(t);
  const first = await loadConfig(context); const second = await loadConfig(context);
  assert.equal(first.token, second.token); assert.equal(first.token.length, 43);
  assert.equal(first.host, '127.0.0.1'); assert.equal(first.port, 42145);
  assert.equal(JSON.parse(await readFile(path.join(context.dataRoot, 'data-schema.json'), 'utf8')).version, 1);
  assert.ok(!(await readdir(context.dataRoot)).includes('.clipboard-bridge'));
  await assert.rejects(prepareRuntime({ ...context }), /validated resolver/);
  await assert.rejects(prepareRuntime(resolveRuntime({ env: { ...env, PANOKOPRU_API_PORT: '42148' } })), /changed/);
});
test('future schema and unversioned legacy state are never silently opened', async t => {
  const { context } = await fixture(t); await prepareRuntime(context);
  const file = path.join(context.dataRoot, 'data-schema.json');
  await writeFile(file, '{"version":999}');
  await assert.rejects(loadConfig(context), { code: 'ERR_DATA_SCHEMA' });
  await rm(file); await writeFile(path.join(context.dataRoot, 'config.json'), '{}');
  await assert.rejects(loadConfig(context), { code: 'ERR_MIGRATION_REQUIRED' });
});
test('exclusive instance lock refuses takeover and releases only its own record', async t => {
  const { context } = await fixture(t); const release = await acquireInstance(context);
  await assert.rejects(acquireInstance(context), { code: 'ERR_INSTANCE_LOCKED' });
  await release(); const again = await acquireInstance(context); await again();
});
