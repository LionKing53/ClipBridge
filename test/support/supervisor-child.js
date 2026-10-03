// Only used by the isolated ownership probe. Never imports app/clipboard code.
import { writeFile } from 'node:fs/promises';
import { attachSupervisorControl } from '../../src/supervisor-control.js';
const keepAlive = setInterval(() => {}, 1000);
attachSupervisorControl(process.stdin, async () => {
  await writeFile(process.argv[2], 'synthetic shutdown completed', { flag: 'wx' });
  clearInterval(keepAlive);
});
