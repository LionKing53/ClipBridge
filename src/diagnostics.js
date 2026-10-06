import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isPublicErrorCode } from './errors.js';
const stages = new Set(['received','unauthorized','reading','normalizing','writing_clipboard','completed','failed']);
const types = new Set(['text','file','image']);
function clean(event) {
  const result = {};
  if (typeof event.startedAt === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(event.startedAt)) result.startedAt = event.startedAt;
  for (const key of ['stage','failedStage']) if (stages.has(event[key])) result[key] = event[key];
  for (const key of ['inputType','outputType']) if (types.has(event[key])) result[key] = event[key];
  for (const key of ['bytes','status']) if (Number.isSafeInteger(event[key]) && event[key] >= 0) result[key] = event[key];
  for (const key of ['rtf','rtfd']) if (typeof event[key] === 'boolean') result[key] = event[key];
  if (['local','tailscale'].includes(event.transport)) result.transport = event.transport;
  if (isPublicErrorCode(event.errorCode)) result.errorCode = event.errorCode;
  return result;
}
export async function createDiagnostics(root) {
  const file = path.join(root, 'transfer-diagnostics.json');
  let events = [], pending = Promise.resolve();
  try { const stored = JSON.parse(await readFile(file, 'utf8')); if (Array.isArray(stored)) events = stored.slice(-60).map(clean); }
  catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
  return { list: () => events.map(value => ({ ...value })), flush: () => pending,
    record(event) { events = [...events, clean(event)].slice(-60); const serialized = JSON.stringify(events);
      pending = pending.then(() => writeFile(file, serialized, 'utf8')).catch(() => {}); }
  };
}
