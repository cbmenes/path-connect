/**
 * Capacitor's System Bars plugin injects `--safe-area-inset-*` by reading
 * `document.documentElement.style` as soon as the window insets arrive. On
 * Android that can run before the document element exists, which throws
 * `TypeError: Cannot read properties of null (reading 'style')` and leaves the
 * WebView to rebuild the board. This waits until the element is there.
 *
 * The plugin source lives in node_modules and is what Gradle compiles, so the
 * patch is applied in place. It is idempotent.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SAFE_AREA_SCRIPT = `try {
                      var applySafeArea = function () {
                        var root = document.documentElement;
                        if (!root || !root.style) return false;
                        root.style.setProperty("--safe-area-inset-top", "%dpx");
                        root.style.setProperty("--safe-area-inset-right", "%dpx");
                        root.style.setProperty("--safe-area-inset-bottom", "%dpx");
                        root.style.setProperty("--safe-area-inset-left", "%dpx");
                        return true;
                      };
                      if (!applySafeArea()) {
                        var arm = function () {
                          if (applySafeArea()) document.removeEventListener("DOMContentLoaded", arm);
                        };
                        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
                        var tries = 0;
                        var timer = setInterval(function () {
                          if (applySafeArea() || ++tries > 40) clearInterval(timer);
                        }, 50);
                      }
                    } catch (e) { console.error('Error injecting safe area CSS:', e); }`;

const UNSAFE =
  /try \{\s*document\.documentElement\.style\.setProperty\("--safe-area-inset-top", "%dpx"\);[\s\S]*?console\.error\('Error injecting safe area CSS:', e\);\s*\}/;

export function patchSystemBarsSource(source) {
  if (source.includes("if (!root || !root.style) return false;")) return source;
  if (!UNSAFE.test(source)) {
    throw new Error("SystemBars.java no longer injects safe-area CSS the way this patch expects");
  }
  return source.replace(UNSAFE, SAFE_AREA_SCRIPT);
}

export function systemBarsPath(root) {
  return join(
    root,
    "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/plugin/SystemBars.java",
  );
}

function main() {
  const root = join(import.meta.dirname, "..");
  const file = systemBarsPath(root);
  const before = readFileSync(file, "utf8");
  const after = patchSystemBarsSource(before);
  if (after !== before) writeFileSync(file, after);
}

if (process.argv[1] && process.argv[1].endsWith("patch-safe-area.mjs")) main();
