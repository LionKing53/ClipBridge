// Advisory single-writer coordination; never forcibly expires another session.
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = new URL('../.local/', import.meta.url);
const lock = new URL('work-lock.json', directory);
const [action, owner] = process.argv.slice(2);
if (!['acquire', 'release', 'status'].includes(action) || (action !== 'status' && !/^[a-z0-9_-]{3,64}$/i.test(owner || ''))) {
  throw new Error('Usage: node scripts/work-lock.js acquire|release <owner> | status');
}
if (action === 'acquire') {
  await mkdir(directory, { recursive: true });
  await writeFile(lock, JSON.stringify({ owner, startedAt: new Date().toISOString(), purpose: 'source editing' }, null, 2) + '\n', { flag: 'wx' });
  console.log('Source lock acquired: ' + owner);
} else {
  let record;
  try { record = JSON.parse(await readFile(lock, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (action === 'status') console.log(record ? JSON.stringify(record) : 'No active source lock.');
  else {
    if (!record || record.owner !== owner) throw new Error('Lock owner mismatch; review the existing session before continuing.');
    await unlink(fileURLToPath(lock));
    console.log('Source lock released: ' + owner);
  }
}
