// Native build only. Android emulator images without Google Play keep the
// System WebView they shipped with (Chrome 103 on Android 13), which lacks
// `dvh`, `color-mix()`, `oklch()`, `oklab()` and the standalone `translate` property.
// There the board size variable is invalid, so the board collapses, and every
// mixed color drops out. This pass rewrites the built CSS so those engines get
// working values while newer engines compute exactly what they did before:
//
// - `100dvh` becomes `calc(100 * var(--pc-dvh, 1dvh))`. Only an engine without
//   `dvh` gets `--pc-dvh: 1vh`, from src/lib/path-connect/legacy-webview.ts.
// - Each `color-mix()` / `oklch()` / `oklab()` becomes `var(--pc-mix-N, <original>)`. The
//   runtime shim defines `--pc-mix-N` only where `color-mix()` is missing, using
//   the source list in the `.pc-legacy-colors` rule appended here.
//   The minifier's fixed fallback for each mix (the default theme's color, in
//   the rule before its `@supports (color: color-mix(...))` copy) is rewritten
//   to read the same variable first.
// - Range media queries (`width >= 720px`, Chrome 104+) become the matching
//   `min-width` / `max-width` form.
// - A selector list with a `:has()` entry (Chrome 105+) is split, so an engine
//   without `:has()` still applies the other selectors.
// - The game's `translate: x y` rules get an `@supports not (translate: 0)`
//   twin that uses `transform`; none of those elements set `transform`.
import postcss from "postcss";

export const MIX_SOURCE_SELECTOR = ".pc-legacy-colors";
export const mixVar = (index) => `--pc-mix-${index}`;
export const mixSourceVar = (index) => `--pc-mix-src-${index}`;

const MODERN_COLOR = /(?<![\w-])(?:color-mix|oklch|oklab)\(/g;
const DVH = /(?<![\w.])(-?\d*\.?\d+)dvh\b/g;

/** Index just past the `)` that closes the call opened at `open` (the `(`). */
function closeParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i + 1;
  }
  return text.length;
}

/** Splits on whitespace that is not inside parentheses. */
function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text.trim()) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

/** Splits a value into literal text and the outermost modern color calls. */
function colorCalls(value) {
  const pieces = [];
  let last = 0;
  MODERN_COLOR.lastIndex = 0;
  for (let match; (match = MODERN_COLOR.exec(value));) {
    const end = closeParen(value, match.index + match[0].length - 1);
    pieces.push({ text: value.slice(last, match.index) });
    pieces.push({ expr: value.slice(match.index, end) });
    last = end;
    MODERN_COLOR.lastIndex = end;
  }
  pieces.push({ text: value.slice(last) });
  return pieces;
}

function indexOf(expr, sources) {
  if (!sources.has(expr)) sources.set(expr, sources.size);
  return sources.get(expr);
}

function wrapColors(value, sources) {
  return colorCalls(value)
    .map((p) => (p.expr ? `var(${mixVar(indexOf(p.expr, sources))}, ${p.expr})` : p.text))
    .join("");
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The minifier lowers `prop: <color-mix value>` into a fixed fallback rule plus
 * an `@supports (color: color-mix(...))` copy. The fallback holds the default
 * theme's colors, so it is rewritten to read `--pc-mix-N` first, keeping each
 * fixed color as that variable's own fallback.
 */
function rewriteFallback(modern, fallback, sources) {
  const pieces = colorCalls(modern);
  const pattern = pieces.map((p) => (p.expr ? "(.+?)" : escapeRegExp(p.text))).join("");
  const fixed = new RegExp(`^${pattern}$`).exec(fallback);
  let group = 0;
  return pieces
    .map((p) => {
      if (!p.expr) return p.text;
      group++;
      const name = mixVar(indexOf(p.expr, sources));
      return fixed ? `var(${name}, ${fixed[group]})` : `var(${name})`;
    })
    .join("");
}

function rewriteSupportsFallbacks(root, sources) {
  root.walkAtRules("supports", (block) => {
    if (!block.params.includes("color-mix")) return;
    const fallback = block.prev();
    if (fallback?.type !== "rule") return;
    block.each((rule) => {
      if (rule.type !== "rule" || rule.selector !== fallback.selector) return;
      rule.each((decl) => {
        if (decl.type !== "decl" || !/color-mix\(|oklch\(|oklab\(/.test(decl.value)) return;
        let twin;
        fallback.each((d) => {
          if (d.type === "decl" && d.prop === decl.prop) twin = d;
        });
        if (twin) twin.value = rewriteFallback(decl.value, twin.value, sources);
      });
    });
  });
}

const MEDIA_RANGE = /\(\s*(width|height)\s*(>=|<=|>|<)\s*([^)]+?)\s*\)/g;

/** `(width >= 48rem)` → `(min-width: 48rem)`; strict `>` / `<` step 0.02px past the edge. */
export function lowerMediaRanges(params) {
  return params.replace(MEDIA_RANGE, (_, feature, op, value) => {
    const bound = op.startsWith(">") ? "min" : "max";
    if (op.length === 2) return `(${bound}-${feature}: ${value})`;
    const step = bound === "min" ? "+" : "-";
    return `(${bound}-${feature}: calc(${value} ${step} 0.02px))`;
  });
}

function inside(node, test) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === "atrule" && test(parent)) return true;
  }
  return false;
}

/** @param {string} css @returns {{ css: string, mixes: number, translates: number }} */
export function legacyWebViewCss(css) {
  const root = postcss.parse(css);
  const sources = new Map();
  const translates = [];
  const rewritten = new WeakSet();

  root.walkAtRules("media", (rule) => {
    rule.params = lowerMediaRanges(rule.params);
  });
  root.walkRules((rule) => {
    const selectors = rule.selectors;
    if (selectors.length < 2 || !selectors.some((s) => s.includes(":has("))) return;
    const plain = selectors.filter((s) => !s.includes(":has("));
    for (const selector of selectors.filter((s) => s.includes(":has("))) {
      rule.after(rule.clone({ selectors: [selector] }));
    }
    rule.selectors = plain;
  });
  root.walkDecls((decl) => {
    decl.value = decl.value.replace(DVH, (_, n) => `calc(${n} * var(--pc-dvh, 1dvh))`);
  });
  rewriteSupportsFallbacks(root, sources);
  root.walkDecls((decl) => {
    if (decl.value.includes("var(--pc-mix-")) rewritten.add(decl);
  });

  root.walkDecls((decl) => {
    if (!rewritten.has(decl)) decl.value = wrapColors(decl.value, sources);
    if (
      decl.prop === "translate" &&
      decl.parent?.type === "rule" &&
      decl.parent.selector.includes(".pc-") &&
      !inside(decl, (rule) => /keyframes$/.test(rule.name))
    ) {
      translates.push(decl);
    }
  });

  for (const decl of translates) {
    const parts = splitTopLevel(decl.value);
    if (parts.length === 0 || parts.length > 2 || parts[0] === "none") continue;
    const twin = postcss.atRule({ name: "supports", params: "not (translate: 0)" });
    twin.append(
      postcss.rule({ selector: decl.parent.selector }).append({
        prop: "transform",
        value: `translate(${parts.join(", ")})`,
      }),
    );
    decl.parent.after(twin);
  }

  if (sources.size > 0) {
    const list = postcss.rule({ selector: MIX_SOURCE_SELECTOR });
    for (const [expr, index] of sources) list.append({ prop: mixSourceVar(index), value: expr });
    root.append(list);
  }
  return { css: root.toString(), mixes: sources.size, translates: translates.length };
}

/** Vite plugin: applies `legacyWebViewCss` to every emitted stylesheet. */
export function legacyWebViewCssPlugin() {
  return {
    name: "path-connect-legacy-webview-css",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "asset" && file.fileName.endsWith(".css")) {
          file.source = legacyWebViewCss(String(file.source)).css;
        }
      }
    },
  };
}
