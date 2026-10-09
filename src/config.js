import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertProductionReady } from '../scripts/source-guard.js';
import { prepareRuntime, resolveRuntime } from './runtime-context.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createPreferences } from './i18n.js';

export async function loadConfig(context) {
  // No CWD-based fallback into a personal installation during source preparation.
  if (!context) { assertProductionReady(); context = resolveRuntime(); }
  await prepareRuntime(context);
  if (context.mode === 'production') {
    assertProductionReady();
    // Harden the metadata-only directory BEFORE creating or reading any secret.
    await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('../scripts/protect-local-state.ps1', import.meta.url)), '-DataRoot', context.dataRoot], { windowsHide: true, timeout: 30000 });
  }
  const stateDirectory = context.dataRoot;
  const configPath = path.join(stateDirectory, 'config.json');
  let stored, fresh = false;

  try {
    stored = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    fresh = true;
    stored = {
      token: randomBytes(32).toString("base64url"),
      createdAt: new Date().toISOString()
    };

    await mkdir(stateDirectory, { recursive: true });
    await writeFile(configPath, `${JSON.stringify(stored, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
  }

  const token = stored.token;
  if (typeof token !== "string" || token.length < 32) {
    throw new Error("Kopru anahtari en az 32 karakter olmali.");
  }

  return {
    host: "127.0.0.1",
    port: context.ports.api,
    context,
    token,
    configPath,
    preferences: await createPreferences(stateDirectory, { existing: !fresh })
  };
}
