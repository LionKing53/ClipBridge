// File-only source delivery: retained upstream tarballs, recipes, patches and notices.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';
import { hashFile } from '../src/package-files.js';
import { assertNoLinks } from '../src/runtime-context.js';
import { sourceFilename } from './fetch-native-sources.js';
const root = fileURLToPath(new URL('../', import.meta.url)), run = promisify(execFile);
const lock = JSON.parse(await readFile(path.join(root, 'native-sources-lock.json'), 'utf8'));
const cache = path.join(root, 'build/native-sources-cache'); await assertNoLinks(cache);
const rust = JSON.parse(await readFile(path.join(cache, 'rust-sources-lock.json'), 'utf8'));
if (rust.provenance !== lock.artifacts.find(x => x.name === 'librsvg').sha256) throw new Error('Wrong Rust source provenance');
const output = path.join(root, 'build', 'native-sources-' + randomUUID()); await assertNoLinks(output); await mkdir(output);
const records = [], notices = []; const tar = path.join(process.env.SystemRoot, 'System32/tar.exe');
for (const item of [...lock.artifacts, ...rust.artifacts]) {
  const name = sourceFilename(item), file = path.join(cache, name);
  if (await hashFile(file) !== item.sha256) throw new Error('Missing or changed source: ' + item.name);
  records.push({ name: 'archives/' + name, file, sha256: item.sha256, url: item.url });
  const listing = (await run(tar, ['-tf', file], { windowsHide: true, maxBuffer: 32 * 1024 * 1024 })).stdout.split(/\r?\n/);
  // Read text to stdout only: never extract archive paths or run upstream code.
  for (const member of listing.filter(name => !name.endsWith('/') && /^(copying|copyright|licen[cs]e|notice|authors)([._-]|$)/i.test(path.posix.basename(name)))) {
    if (member.startsWith('-') || member.includes('\0') || member.includes('\n')) throw new Error('Unsafe member');
    const content = (await run(tar, ['-xOf', file, member], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 })).stdout;
    if (!content.includes('\0')) notices.push(`\n===== ${item.name}@${item.version}: ${member} =====\n${content}\n`);
  }
}
const checkouts = { vips: 'native-source-review-8.18.7', mxe: 'native-mxe-review-20260924', sharp: 'sharp-source-review-0.35.5', 'sharp-libvips': 'sharp-libvips-source-review-1.3.4' };
for (const [name, recipe] of Object.entries(lock.recipes)) {
  const cwd = path.join(root, 'build', checkouts[name]); await assertNoLinks(cwd);
  if ((await run('git', ['rev-parse', 'HEAD'], { cwd, windowsHide: true })).stdout.trim() !== recipe.commit || (await run('git', ['status', '--porcelain'], { cwd, windowsHide: true })).stdout.trim()) throw new Error('Recipe checkout must match pinned clean commit');
  const file = path.join(output, name + '-recipe.tar');
  await run('git', ['archive', '--format=tar', '--prefix=' + name + '/', '--output=' + file, recipe.commit], { cwd, windowsHide: true });
  records.push({ name: 'recipes/' + name + '.tar', file, sha256: await hashFile(file), commit: recipe.commit, repository: recipe.repository });
}
const texts = {
  'native-sources-lock.json': await readFile(path.join(root, 'native-sources-lock.json')),
  'rust-sources-lock.json': await readFile(path.join(cache, 'rust-sources-lock.json')),
  'NATIVE-NOTICES.txt': 'Collected original license/copyright files; includes a superset of source/test/platform components, not a claim all are linked.\n' + notices.join(''),
  'REBUILD.md': await readFile(path.join(root, 'docs/NATIVE-REBUILD.md'))
};
const inventory = records.map(({file, ...record}) => record);
texts['inventory.json'] = JSON.stringify({ format: 1, sharp: lock.sharp, artifacts: inventory, compiledHere: false }, null, 2);
for (const [name, bytes] of Object.entries(texts)) { const file = path.join(output, name); await writeFile(file, bytes, { flag: 'wx' }); records.push({ name, file, sha256: await hashFile(file) }); }
const bundle = path.join(output, 'ClipBridge-sharp-0.35.5-sources.zip');
const stream = createWriteStream(bundle, { flags: 'wx' }), archive = new ZipArchive({ zlib: { level: 6 } });
const finished = once(stream, 'close'); archive.on('error', error => stream.destroy(error)); archive.pipe(stream);
for (const record of records) archive.file(record.file, { name: record.name, date: new Date('2000-01-01T00:00:00Z') });
await archive.finalize(); await finished;
const evidence = { format: 1, bundle: path.relative(root, bundle), sha256: await hashFile(bundle), nativeArchives: lock.artifacts.length, rustArchives: rust.artifacts.length, recipeArchives: Object.keys(lock.recipes).length, noticeFiles: notices.length, compiledHere: false };
await writeFile(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));
