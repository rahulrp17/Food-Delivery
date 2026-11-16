import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.resolve(helpersDir, "../../../backend/.env");

let cached = null;

export function backendEnv() {
  if (cached) return cached;

  const fileValues = {};

  if (fs.existsSync(backendEnvPath)) {
    for (const line of fs.readFileSync(backendEnvPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      fileValues[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }

  cached = { ...fileValues, ...process.env };
  return cached;
}

export function requireEnv(name) {
  const value = backendEnv()[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in backend/.env or in the environment before running the E2E suite.`
    );
  }

  return value;
}
