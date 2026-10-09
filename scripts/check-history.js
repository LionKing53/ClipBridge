// Read-only reachable Git history audit. No checkout/rewrite, no content snippets
// in output. It is a bounded heuristic gate, not a complete secret/visual review.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { documentationImagePolicy, historicalDocumentationImagePolicy, matchesDocumentationImage } from './documentation-images.js';
const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));

export function inspectHistoryContent(buffer, privateTerms = []) {
  const text = buffer.toString('utf8'), issues = [];
  if (buffer.includes(0) || !Buffer.from(text, 'utf8').equals(buffer)) issues.push('binary_or_invalid_utf8_requires_review');
  if (/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(text)) issues.push('private_key');
  if (/[A-Z]:[\\/]+Users[\\/]+[^\s\\/]+/i.test(text)) issues.push('personal_absolute_path');
  if (/https?:\/\/[^\s"']+\.ts\.net\b/i.test(text)) issues.push('personal_tailnet_address');
  if (/Bearer\s+[a-zA-Z0-9_-]{32,}/.test(text)) issues.push('potential_access_key');
  if (privateTerms.some(term => text.toLowerCase().includes(term.toLowerCase()))) issues.push('private_local_term');
  return issues;
}
export function inspectHistoryPath(name, mode, allowed, documentationImages = new Map()) {
  if (mode !== '100644' && mode !== '100755') return ['linked_or_nonregular_history_entry'];
  if (!allowed.has(name)) return ['historical_path_outside_current_allowlist'];
  if (/(^|\/)(node_modules|vendor|runtime|build|dist|\.local|\.clipboard-bridge)(\/|$)|\.(pfx|p12|pem|key|cer|dpapi|exe|dll|zip|png|ico)$/i.test(name) && !documentationImages.has(name)) return ['private_or_generated_history_path'];
  return [];
}

export async function auditReachableHistory({ repository = root, allowed, privateTerms = [], documentationImages = new Map(), historicalDocumentationImages = [] }) {
  if (!(allowed instanceof Set) || !Array.isArray(privateTerms) || privateTerms.some(term => typeof term !== 'string' || !term.length)) throw new TypeError('Explicit valid history policy required.');
  const git = async args => (await run('git', args, { cwd: repository, windowsHide: true, timeout: 10000, maxBuffer: 16 * 1024 ** 2 })).stdout;
  const refsBefore = await git(['show-ref', '--head']);
  const commits = (await git(['rev-list', '--all'])).trim().split(/\s+/).filter(Boolean);
  const objects = new Set((await git(['rev-list', '--objects', '--all'])).split('\n').filter(Boolean).map(line => line.split(' ', 1)[0]));
  const findings = [], seenTrees = new Set();
  const add = (object, codes) => { for (const code of codes) findings.push({ object, code }); };
  for (const commit of commits) {
    if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Unsupported Git object format.');
    const tree = (await git(['show', '-s', '--format=%T', commit])).trim();
    if (seenTrees.has(tree)) continue; seenTrees.add(tree);
    for (const entry of (await git(['ls-tree', '-r', '-z', '--full-tree', tree])).split('\0').filter(Boolean)) {
      const tab = entry.indexOf('\t'); const [mode, type, object] = entry.slice(0, tab).split(' ');
      if (tab < 0 || !/^[a-f0-9]{40}$/.test(object)) throw new Error('Unexpected Git tree response.');
      add(object, inspectHistoryPath(entry.slice(tab + 1), mode, allowed, documentationImages));
      if (type !== 'blob') add(object, ['non_blob_history_entry']);
    }
  }
  let blobs = 0, metadata = 0, reviewedImages = 0;
  for (const object of objects) {
    if (!/^[a-f0-9]{40}$/.test(object)) throw new Error('Unsupported Git object format.');
    const type = (await git(['cat-file', '-t', object])).trim();
    if (type === 'tree') continue;
    if (!['blob', 'commit', 'tag'].includes(type)) { add(object, ['unknown_object_type']); continue; }
    const size = Number((await git(['cat-file', '-s', object])).trim());
    if (!Number.isSafeInteger(size) || size > 4 * 1024 ** 2) { add(object, ['oversized_object_requires_review']); continue; }
    const { stdout } = await run('git', ['cat-file', type, object], { cwd: repository, windowsHide: true, timeout: 10000, encoding: 'buffer', maxBuffer: 4 * 1024 ** 2 + 1 });
    if (type === 'blob' && [...documentationImages.values(), ...historicalDocumentationImages].some(entry => matchesDocumentationImage(stdout, entry))) reviewedImages++;
    else add(object, inspectHistoryContent(stdout, privateTerms));
    if (type === 'blob') blobs++; else metadata++;
  }
  if (await git(['show-ref', '--head']) !== refsBefore) throw new Error('Git references changed during review; repeat the audit.');
  return { format: 1, scope: 'all-currently-reachable-refs', commits: commits.length, blobs, metadata, reviewedImages,
    privateTermsApplied: privateTerms.length > 0, passed: findings.length === 0, findings,
    limitations: ['Heuristic patterns, not comprehensive secret detection.', 'Unreachable/reflog objects and ignored files are not publication inputs and not inspected.',
      'QR/images, final archives, source/binary license obligations and publisher authenticity require separate review.'] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(await readFile(path.join(root, 'source-manifest.json'), 'utf8'));
  const historicalFiles = manifest.historicalFiles || [];
  if (!Array.isArray(historicalFiles) || historicalFiles.some(name => typeof name !== 'string' || name.startsWith('/') || name.includes('\\') || name.includes(':') || name.split('/').some(part => !part || part === '.' || part === '..'))) throw new Error('Invalid historical source paths.');
  // Retired reviewed paths remain content-scanned in history but are not source/package inputs.
  const allowed = new Set([...manifest.files, ...historicalFiles]);
  let privateTerms = [];
  try { privateTerms = JSON.parse(await readFile(path.join(root, '.local/privacy-terms.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = await auditReachableHistory({ allowed, privateTerms, documentationImages: documentationImagePolicy(manifest), historicalDocumentationImages: historicalDocumentationImagePolicy(manifest) });
  console.log(JSON.stringify(report, null, 2)); // Object IDs + finding codes only, never names/content/secret terms.
  if (!report.passed) process.exitCode = 1;
}
