import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertProductionReady } from '../scripts/source-guard.js';

const stateDirectory = path.resolve(".clipboard-bridge");
const configPath = path.join(stateDirectory, "config.json");

function parsePort(value) {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Gecersiz BRIDGE_PORT degeri: ${value}`);
  }
  return port;
}

export async function loadConfig() {
  // No CWD-based fallback into a personal installation during source preparation.
  assertProductionReady();
  let stored;

  try {
    stored = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

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

  const token = process.env.BRIDGE_TOKEN || stored.token;
  if (typeof token !== "string" || token.length < 32) {
    throw new Error("Kopru anahtari en az 32 karakter olmali.");
  }

  return {
    host: process.env.BRIDGE_HOST || "127.0.0.1",
    port: parsePort(process.env.BRIDGE_PORT || "32145"),
    token,
    configPath
  };
}
