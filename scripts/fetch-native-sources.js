// Download only. Never execute or extract upstream build scripts.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { assertNoLinks } from '../src/runtime-context.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export function sourceFilename(item) {
  if (!/^[a-zA-Z0-9_-]+$/.test(item.name) || !/^[a-zA-Z0-9.+-]+$/.test(item.version) || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Invalid source identity');
  const url = new URL(item.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('HTTPS source required');
  const suffix = /\.tar\.(gz|xz|bz2)$/.exec(url.pathname)?.[0] || (url.hostname === 'static.crates.io' && url.pathname.endsWith('.crate') ? '.crate' : null);
  if (!suffix) throw new Error('Reviewed source archive required');
  return `${item.name}-${item.version}${suffix}`;
}
export async function fetchPinnedSource(item, directory, fetcher = fetch) {
  const name = sourceFilename(item), file = path.join(directory, name);
  await assertNoLinks(file);
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  try {
    const cached = await readFile(file);
    if (hash(cached) !== item.sha256) throw new Error('Cached source hash mismatch');
    return { name, bytes: cached.length, sha256: item.sha256 };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let url = item.url, response;
  for (let redirects = 0; redirects < 8; redirects++) {
    if (new URL(url).protocol !== 'https:') throw new Error('Insecure source redirect');
    response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(120000) });
    if (![301,302,303,307,308].includes(response.status)) break;
    await response.body?.cancel();
    url = new URL(response.headers.get('location'), url).href;
  }
  if (!response?.ok) throw new Error(`Source HTTP ${response?.status}`);
  const limit = 256 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('Source too large'); }
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) { bytes += chunk.length; if (bytes > limit) throw new Error('Source too large'); chunks.push(chunk); }
  const content = Buffer.concat(chunks);
  if (hash(content) !== item.sha256) throw new Error('Downloaded source hash mismatch');
  const temporary = file + '.' + randomUUID() + '.part';
  await writeFile(temporary, content, { flag: 'wx' });
  // Concurrent invocations are disallowed by the repository work contract.
  await rename(temporary, file);
  return { name, bytes, sha256: item.sha256 };
}
async function main() {
  const lock = JSON.parse(await readFile(path.join(root, 'native-sources-lock.json'), 'utf8'));
  const directory = path.join(root, 'build/native-sources-cache'); await assertNoLinks(directory); await mkdir(directory, { recursive: true });
  if (process.argv.includes('--crates')) {
    const item = lock.artifacts.find(item => item.name === 'librsvg');
    const verified = await fetchPinnedSource(item, directory);
    const { stdout } = await promisify(execFile)('tar', ['-xOf', path.join(directory, verified.name), `librsvg-${item.version}/Cargo.lock`], { windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    lock.artifacts = [];
    for (const block of stdout.split('[[package]]').slice(1)) {
      const field = name => new RegExp('^' + name + ' = "([^"]+)"', 'm').exec(block)?.[1];
      const source = field('source'); if (!source) continue;
      if (source !== 'registry+https://github.com/rust-lang/crates.io-index') throw new Error('Unreviewed Rust source');
      const name = field('name'), version = field('version'), sha256 = field('checksum');
      lock.artifacts.push({ name, version, sha256, url: `https://static.crates.io/crates/${name}/${name}-${version}.crate` });
    }
    await writeFile(path.join(directory, 'rust-sources-lock.json'), JSON.stringify({ provenance: item.sha256, note: 'Superset of original Cargo.lock; upstream patches remove some features/crates.', artifacts: lock.artifacts }, null, 2));
  }
  const results = [], failures = []; let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < lock.artifacts.length) {
      const item = lock.artifacts[cursor++];
      try { results.push(await fetchPinnedSource(item, directory)); console.log('Verified source: ' + item.name); }
      catch (error) { failures.push({ name: item.name, error: error.message }); console.log('Source failed: ' + item.name + ': ' + error.message); }
    }
  }));
  console.log(JSON.stringify({ verified: results.length, required: lock.artifacts.length, failures }));
  if (failures.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
