// scripts/launch-detached.mjs
// Spawn serve.mjs as a fully detached background process that survives this shell exiting.
// Run: node scripts/launch-detached.mjs

import { spawn } from "node:child_process";
import { writeFileSync, existsSync, unlinkSync, readFileSync, openSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const servePath = join(__dirname, "serve.mjs");
const logPath = "C:\\Users\\Gideon\\AppData\\Local\\Temp\\metagor-detached.log";
const pidFile = "C:\\Users\\Gideon\\AppData\\Local\\Temp\\metagor-detached.pid";

if (existsSync(pidFile)) {
  try {
    const oldPid = Number(readFileSync(pidFile, "utf8"));
    process.kill(oldPid, "SIGTERM");
    console.log(`[launch] killed previous server pid=${oldPid}`);
  } catch {}
  try { unlinkSync(pidFile); } catch {}
}

const out = openSync(logPath, "a");
const child = spawn(process.execPath, [servePath], {
  cwd: join(__dirname, ".."),
  detached: true,
  stdio: ["ignore", out, out],
  windowsHide: true
});
child.unref();

writeFileSync(pidFile, String(child.pid));
console.log(`[launch] detached pid=${child.pid} log=${logPath}`);
console.log(`[launch] open http://localhost:8080/`);
