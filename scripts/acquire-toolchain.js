// Downloads official pinned archives only; never installs or executes them.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { downloadArtifact } from '../src/artifact-download.js';
const lock = JSON.parse(await readFile(new URL('../toolchain-lock.json', import.meta.url), 'utf8'));
if (lock.format !== 1 || lock.target !== 'win-x64') throw new Error('Unsupported toolchain lock.');
const cache = fileURLToPath(new URL('../build/toolchain-downloads/', import.meta.url));
for (const artifact of lock.artifacts) {
  const result = await downloadArtifact(artifact, cache);
  console.log(`${artifact.id}@${artifact.version}: verified ${result.bytes} bytes (${result.cached ? 'cache' : 'download'}).`);
}
