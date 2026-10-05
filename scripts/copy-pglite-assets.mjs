#!/usr/bin/env node
/**
 * The Vercel function bundles PGLite and then loads pglite.data, pglite.wasm,
 * and initdb.wasm from the same directory as that bundle (import.meta.url).
 * Vite does not emit those binaries, so the first request crashes with ENOENT
 * and Nitro returns {"error":true,"status":500,"unhandled":true}.
 */
import { copyFile, readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const sourceDir = dirname(require.resolve("@electric-sql/pglite"));
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];
const outputRoot = ".vercel/output/functions";

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (entry.name.endsWith(".mjs") || entry.name.endsWith(".js")) found.push(path);
  }
  return found;
}

const targets = new Set();
for (const file of await walk(outputRoot)) {
  let text = "";
  try {
    text = await readFile(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes('"./pglite.data"') || text.includes('"./pglite.wasm"') || text.includes('"./initdb.wasm"')) {
    targets.add(dirname(file));
  }
}

if (!targets.size) {
  console.log("[pglite] no bundled PGLite output — skipping asset copy");
  process.exit(0);
}

for (const dir of targets) {
  for (const name of files) {
    await copyFile(join(sourceDir, name), join(dir, name));
  }
  console.log(`[pglite] copied data and wasm into ${dir}`);
}
