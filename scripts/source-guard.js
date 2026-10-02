import { existsSync } from 'node:fs';

export function assertProductionReady() {
  if (existsSync(new URL('../SOURCE-CHECKOUT', import.meta.url))) {
    const error = new Error('Development-only checkout: production startup/build is blocked until data, port and process isolation is implemented. Use npm test or npm run test:ui. See PROJECT-STATUS.md.');
    error.code = 'ERR_SOURCE_CHECKOUT';
    throw error;
  }
}
