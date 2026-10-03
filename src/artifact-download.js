import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, open, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { assertNoLinks } from './runtime-context.js';
const allowed = new Set(['nodejs.org', 'api.nuget.org']);
const fail = code => Object.assign(new Error(code), { code });
export function validateArtifact(artifact) {
  const url = new URL(artifact.url);
  if (url.protocol !== 'https:' || !allowed.has(url.hostname) || url.port || url.username || url.password || url.search || url.hash ||
      !/^[a-zA-Z0-9_.-]+$/.test(artifact.file || '') || artifact.file.startsWith('.') ||
      !Number.isSafeInteger(artifact.maxBytes) || artifact.maxBytes < 1 || artifact.maxBytes > 256 * 1024 ** 2 ||
      !((artifact.algorithm === 'sha256' && artifact.encoding === 'hex' && /^[a-f0-9]{64}$/.test(artifact.integrity || '')) ||
        (artifact.algorithm === 'sha512' && artifact.encoding === 'base64' && /^[A-Za-z0-9+/]{86}==$/.test(artifact.integrity || '')))) throw fail('ERR_ARTIFACT_POLICY');
  return artifact;
}
async function verify(file, artifact) {
  await assertNoLinks(file);
  const info = await lstat(file);
  if (!info.isFile() || info.size > artifact.maxBytes) throw fail('ERR_ARTIFACT_SIZE');
  const digest = createHash(artifact.algorithm);
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  if (digest.digest(artifact.encoding) !== artifact.integrity) throw fail('ERR_ARTIFACT_INTEGRITY');
  return info.size;
}
export async function downloadArtifact(artifact, directory, { fetcher = fetch, signal } = {}) {
  validateArtifact(artifact);
  if (!path.isAbsolute(directory)) throw fail('ERR_ARTIFACT_DIRECTORY');
  await assertNoLinks(directory); await mkdir(directory, { recursive: true });
  const target = path.join(directory, artifact.file);
  try { return { file: target, bytes: await verify(target, artifact), cached: true }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temporary = path.join(directory, '.' + randomUUID() + '.part');
  let file;
  try {
    const response = await fetcher(artifact.url, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000) });
    if (!response.ok || !response.body) throw fail('ERR_ARTIFACT_HTTP');
    const length = response.headers.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > artifact.maxBytes)) {
      await response.body.cancel(); throw fail('ERR_ARTIFACT_SIZE');
    }
    file = await open(temporary, 'wx');
    let bytes = 0; const digest = createHash(artifact.algorithm);
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > artifact.maxBytes) throw fail('ERR_ARTIFACT_SIZE');
      digest.update(chunk); await file.writeFile(chunk);
    }
    if (digest.digest(artifact.encoding) !== artifact.integrity) throw fail('ERR_ARTIFACT_INTEGRITY');
    await file.sync(); await file.close(); file = undefined;
    // Atomic no-clobber publication on the same volume. Never rename-overwrite
    // another builder's output. Unsupported hard links fail closed.
    await link(temporary, target);
    return { file: target, bytes, cached: false };
  } finally { await file?.close(); await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
