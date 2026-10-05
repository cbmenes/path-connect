#!/usr/bin/env node
/**
 * Nitro names oversized shared chunks `name+[...].mjs`.
 * Vercel collects function files with a glob, and square brackets are a
 * character class, so those chunks never land in the deployment. The first
 * request then dies inside the SSR import with Nitro's
 * {"error":true,"status":500,"unhandled":true}.
 *
 * Rename the chunks to literal filenames and rewrite the imports that point
 * at them. `+` is left alone: those chunks are already on the live function.
 */
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const outputRoot = ".vercel/output/functions";
const GLOB_META = /[[\]*?{}]/;

function safeName(name) {
  return name.replace(/[[\]*?{}]/g, "_");
}

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
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

const files = await walk(outputRoot);
const renames = [];
for (const file of files) {
  const fromBase = basename(file);
  if (!GLOB_META.test(fromBase)) continue;
  const toBase = safeName(fromBase);
  if (toBase === fromBase) continue;
  renames.push({ file, fromBase, toBase, dest: join(dirname(file), toBase) });
}

if (!renames.length) {
  console.log("[vercel-chunks] no glob-unsafe chunk names");
  process.exit(0);
}

for (const item of renames) {
  await rename(item.file, item.dest);
  console.log(`[vercel-chunks] ${item.fromBase} -> ${item.toBase}`);
}

const rewritten = new Set(renames.map((item) => item.dest));
for (const file of await walk(outputRoot)) {
  if (!file.endsWith(".mjs") && !file.endsWith(".js") && !file.endsWith(".json") && !file.endsWith(".map")) {
    continue;
  }
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    continue;
  }
  let next = text;
  for (const item of renames) {
    if (next.includes(item.fromBase)) next = next.replaceAll(item.fromBase, item.toBase);
  }
  if (next !== text) {
    await writeFile(file, next);
    rewritten.add(file);
  }
}
