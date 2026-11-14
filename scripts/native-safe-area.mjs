import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

/** The page script the iOS shell injects, with the measured top inset filled in. */
export function nativeSafeAreaScript(top) {
  const scene = readFileSync(join(root, "ios/App/App/SceneDelegate.swift"), "utf8");
  const match = scene.match(/safeAreaScript = """\n([\s\S]*?)\n\s*"""/);
  if (!match) throw new Error("SceneDelegate.swift no longer has the safe-area script");
  return match[1].trim().replace("__TOP__", top);
}
