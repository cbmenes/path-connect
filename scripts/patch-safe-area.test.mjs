import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { patchSystemBarsSource, SAFE_AREA_SCRIPT, systemBarsPath } from "./patch-safe-area.mjs";

const unsafe = `String script = String.format(
                    Locale.US,
                    """
                    try {
                      document.documentElement.style.setProperty("--safe-area-inset-top", "%dpx");
                      document.documentElement.style.setProperty("--safe-area-inset-right", "%dpx");
                      document.documentElement.style.setProperty("--safe-area-inset-bottom", "%dpx");
                      document.documentElement.style.setProperty("--safe-area-inset-left", "%dpx");
                    } catch(e) { console.error('Error injecting safe area CSS:', e); }
                    """,
`;

test("safe-area CSS waits until the document element exists", () => {
  const patched = patchSystemBarsSource(unsafe);
  assert.equal(patched.includes("document.documentElement.style.setProperty"), false);
  assert.match(patched, /if \(!root \|\| !root\.style\) return false;/);
  assert.equal(patchSystemBarsSource(patched), patched);

  const sets = [];
  const errors = [];
  let interval = null;
  const root = {
    style: {
      setProperty: (name, value) => sets.push([name, value]),
    },
  };
  const doc = {
    documentElement: null,
    readyState: "loading",
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const script = SAFE_AREA_SCRIPT.replaceAll("%d", "24");
  vm.runInNewContext(script, {
    document: doc,
    setInterval: (fn) => {
      interval = fn;
      return 1;
    },
    clearInterval: () => {
      interval = null;
    },
    console: { error: (...args) => errors.push(args.join(" ")) },
  });
  assert.deepEqual(sets, []);
  assert.deepEqual(errors, []);
  interval?.();
  assert.deepEqual(sets, []);
  doc.documentElement = root;
  interval?.();
  assert.deepEqual(sets, [
    ["--safe-area-inset-top", "24px"],
    ["--safe-area-inset-right", "24px"],
    ["--safe-area-inset-bottom", "24px"],
    ["--safe-area-inset-left", "24px"],
  ]);
});

test("the Android plugin source is patched", () => {
  const source = readFileSync(systemBarsPath(join(import.meta.dirname, "..")), "utf8");
  assert.match(patchSystemBarsSource(source), /if \(!root \|\| !root\.style\) return false;/);
});
