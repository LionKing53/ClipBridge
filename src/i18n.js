import { readFileSync } from 'node:fs';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

export const messages = JSON.parse(readFileSync(new URL('../locales/messages.json', import.meta.url), 'utf8'));
export const errorMessages = JSON.parse(readFileSync(new URL('../locales/errors.json', import.meta.url), 'utf8'));
export const normalizeLanguage = value => /^tr(?:[-_]|$)/i.test(value || '') ? 'tr' : 'en';
export const localeFor = language => language === 'tr' ? 'tr-TR' : 'en-US';
const ownedMessages = new Map(Object.entries(messages).map(([key, value]) => [value.tr, key]));
// Exact owned backend labels from the reviewed legacy adapter, not substring
// replacement over clipboard content, file names or user-defined network names.
for (const [key, value] of Object.entries(messages)) {
  if (value.tr.includes('ClipBridge')) for (const previous of ['PanoKöprü','PanoKopru']) ownedMessages.set(value.tr.replaceAll('ClipBridge',previous),key);
}
export const translateMessage = (message, language) => ownedMessages.has(message) ? translate(ownedMessages.get(message), language) : message;
export function translate(key, language = 'tr', values = {}) {
  const entry = messages[key] || errorMessages[key];
  if (!entry) throw new Error('Unknown translation key: ' + key);
  return entry[language === 'en' ? 'en' : 'tr'].replace(/\{([a-z]+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}
export async function createPreferences(root, { existing = true, systemLocale = process.env.CLIPBRIDGE_SYSTEM_LANGUAGE || Intl.DateTimeFormat().resolvedOptions().locale } = {}) {
  const file = path.join(root, 'ui-settings.json');
  let value;
  try { value = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; value = { language: existing ? 'tr' : normalizeLanguage(systemLocale) }; }
  // A legacy preference without language remains Turkish; preserve other fields.
  if (!['tr','en'].includes(value.language)) value.language = 'tr';
  let queue = Promise.resolve();
  async function persist(next) {
    await mkdir(root, { recursive: true });
    await writeFile(file + '.tmp', JSON.stringify(next, null, 2) + '\n', 'utf8');
    await rename(file + '.tmp', file);
    value = next;
  }
  if (!await stat(file).catch(error => { if(error.code !== 'ENOENT') throw error; return null; })) await persist(value);
  return {
    get: () => ({ language: value.language }),
    set(language) {
      if (!['tr','en'].includes(language)) throw Object.assign(new Error('Invalid language'), { statusCode: 400 });
      const operation = queue.then(() => persist({ ...value, language }));
      queue = operation.catch(() => {});
      return operation;
    }
  };
}
