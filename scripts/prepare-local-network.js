import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { prepareLocalNetwork } from '../src/local-network.js';
const profile = process.argv[2];
if (!/^\{[a-f0-9-]{36}\}$/i.test(profile || '')) throw new Error('Explicit approved Windows network profile ID required.');
const config = await loadConfig();
console.log(JSON.stringify(await prepareLocalNetwork(path.dirname(config.configPath), profile)));
