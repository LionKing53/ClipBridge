// Owner-directed library recombination, only inside a fresh build candidate.
// Never weakens installed-file verification or changes a running installation.
import path from 'node:path';
import { readFile, readdir, copyFile, lstat } from 'node:fs/promises';
import { assertNoLinks, within } from './runtime-context.js';
import { hashFile } from './package-files.js';
export const replaceableLibraries = Object.freeze(['libvips-42.dll', 'libvips-cpp-8.18.7.dll', 'sharp-win32-x64-0.35.5.node']);
export function assertX64Library(bytes) {
  const pe = bytes.length >= 64 ? bytes.readUInt32LE(60) : -1;
  if (bytes.length < 64 || bytes.toString('ascii',0,2) !== 'MZ' || pe < 64 || pe > bytes.length - 24 || bytes.readUInt32LE(pe) !== 0x4550 || bytes.readUInt16LE(pe+4) !== 0x8664 || !(bytes.readUInt16LE(pe+22) & 0x2000)) throw new Error('A Windows x64 DLL/Node library is required');
}
export async function applyNativeOverride(workspace, app, input) {
  workspace = path.resolve(workspace); app = path.resolve(app); input = path.resolve(input);
  const relative = path.relative(path.join(workspace,'build'),app).replaceAll('\\','/');
  if (!/^candidate-[a-f0-9-]{36}\/payload\/app$/.test(relative) || !within(path.join(workspace,'build'),app) || within(app,input) || within(input,app)) throw new Error('Only a fresh owned build candidate may be changed');
  await assertNoLinks(input); await assertNoLinks(app);
  const entries = await readdir(input, { withFileTypes: true });
  if (!entries.length || entries.some(e => !e.isFile() || e.isSymbolicLink() || !replaceableLibraries.includes(e.name))) throw new Error('Input must contain only explicitly replaceable libraries');
  const records = [];
  for (const entry of entries) {
    const from = path.join(input,entry.name), to = path.join(app,'node_modules/@img/sharp-win32-x64/lib',entry.name);
    await assertNoLinks(from); await assertNoLinks(to);
    if (!(await lstat(to)).isFile() || (await lstat(from)).size > 256*1024*1024) throw new Error('Invalid library target or size');
    const bytes = await readFile(from); assertX64Library(bytes);
    records.push({ name: entry.name, originalSHA256: await hashFile(to), replacementSHA256: await hashFile(from) });
  }
  for (const record of records) {
    const from = path.join(input,record.name), to = path.join(app,'node_modules/@img/sharp-win32-x64/lib',record.name);
    if (await hashFile(from) !== record.replacementSHA256) throw new Error('Library changed during build');
    await copyFile(from,to);
    if (await hashFile(to) !== record.replacementSHA256) throw new Error('Library copy mismatch');
  }
  return { modified: true, userSupplied: true, compatibilityTested: false, files: records };
}
