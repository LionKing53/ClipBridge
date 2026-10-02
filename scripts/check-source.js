// A source allowlist gate, not a substitute for full history/archive/visual review.
import { readFile, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'source-manifest.json'), 'utf8'));
const allowed = new Set(manifest.files);
if (manifest.version !== 1 || allowed.size !== manifest.files.length) throw new Error('Invalid source manifest.');
const forbiddenPath = /(^|\/)(node_modules|vendor|runtime|build|dist|\.local|\.clipboard-bridge)(\/|$)|\.(pfx|p12|pem|key|cer|dpapi|exe|dll|zip|png|ico)$/i;
const failures = [];
let privateTerms = [];
try { privateTerms = JSON.parse(await readFile(path.join(root, '.local/privacy-terms.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const name of allowed) {
  if (typeof name !== 'string' || name.includes('\\') || name.startsWith('/') || name.includes(':') || name.split('/').includes('..') || forbiddenPath.test(name)) {
    failures.push('Invalid allowlist path'); continue;
  }
  const target = path.join(root, name);
  const metadata = await lstat(target);
  if (!metadata.isFile() || metadata.isSymbolicLink()) { failures.push('Non-regular source file: ' + name); continue; }
  const text = await readFile(target, 'utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(text)
      || /[A-Z]:[\\/]+Users[\\/]+[^\s\\/]+/i.test(text)
      || /https?:\/\/[^\s"']+\.ts\.net\b/i.test(text)
      || /Bearer\s+[a-zA-Z0-9_-]{32,}/.test(text)) failures.push('Potential private content: ' + name);
  if (privateTerms.some(term => text.toLowerCase().includes(term.toLowerCase()))) failures.push('Machine-specific term: ' + name);
}
// Once Git exists, reject all staged/tracked/non-ignored files outside the manifest.
try {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\0').filter(Boolean);
  for (const name of files) if (!allowed.has(name)) failures.push('Unapproved source file: ' + name);
} catch (error) {
  if (!String(error.stderr).includes('not a git repository')) throw error;
  console.log('Git is not initialized; only manifest files were checked.');
}
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
for (const [name, entry] of Object.entries(lock.packages || {})) {
  if (!name) continue;
  const url = new URL(entry.resolved);
  if (url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org' || url.username || url.password || !/^sha512-/.test(entry.integrity || '')) failures.push('Dependency origin/integrity missing: ' + name);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Source gate PASS: ${allowed.size} allowed text sources; ${Object.keys(lock.packages).length - 1} locked dependency entries. Full release audit is still required.`);
