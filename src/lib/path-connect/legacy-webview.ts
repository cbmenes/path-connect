/**
 * Runtime half of scripts/legacy-webview-css-plugin.mjs, for Android System
 * WebViews older than Chrome 111 (emulator images without Google Play never
 * update theirs). The native stylesheet writes every `color-mix()` / `oklch()`
 * as `var(--pc-mix-N, <original>)` and lists the originals in one
 * `.pc-legacy-colors` rule. Where `color-mix()` is missing, this computes each
 * original against the theme variables in force and sets `--pc-mix-N` on the
 * page root and on each game root, so the board keeps its colors. The pipe
 * strokes in tile-art.tsx are inline, so their layer mixes are filled the same way. Engines that
 * support `color-mix()` and `dvh`, and the website build, are left untouched.
 */

import { PIPE_LAYERS, pipeLayerMix, pipeLayerVar } from "./pipe-layers.ts";

export const MIX_SOURCE_SELECTOR = ".pc-legacy-colors";
const SOURCE_PREFIX = "--pc-mix-src-";
const SCOPE_SELECTOR = ".path-connect, [data-theme]";

/** sRGB channels 0–1 and alpha 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export type Resolve = (name: string) => string | undefined;

const NAMED: Record<string, Rgba> = {
  transparent: { r: 0, g: 0, b: 0, alpha: 0 },
  black: { r: 0, g: 0, b: 0, alpha: 1 },
  white: { r: 1, g: 1, b: 1, alpha: 1 },
  red: { r: 1, g: 0, b: 0, alpha: 1 },
};

function closeParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

function splitCommas(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth--;
    else if (text[i] === "," && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

/** Replaces each `var(--name[, fallback])` with its value, innermost names first. */
export function substituteVars(text: string, resolve: Resolve, depth = 0): string | undefined {
  if (depth > 12) return undefined;
  let out = "";
  let index = 0;
  for (;;) {
    const at = text.indexOf("var(", index);
    if (at < 0) return out + text.slice(index);
    const end = closeParen(text, at + 3);
    if (end < 0) return undefined;
    const [name, ...rest] = splitCommas(text.slice(at + 4, end));
    const fallback = rest.length > 0 ? rest.join(", ") : undefined;
    const raw = resolve(name) || fallback;
    if (!raw) return undefined;
    const value = substituteVars(raw, resolve, depth + 1);
    if (value === undefined) return undefined;
    out += text.slice(index, at) + value;
    index = end + 1;
  }
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toOklab({ r, g, b }: Rgba): [number, number, number] {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: [number, number, number], alpha: number): Rgba {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (c: number) => Math.min(1, Math.max(0, toGamma(c)));
  return {
    r: clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alpha,
  };
}

function parseNumber(token: string, percentScale = 1): number {
  if (token === "none") return 0;
  return token.endsWith("%") ? (parseFloat(token) / 100) * percentScale : parseFloat(token);
}

function parseHex(hex: string): Rgba | undefined {
  const digits =
    hex.length <= 4
      ? hex
          .split("")
          .map((d) => d + d)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(digits)) return undefined;
  const byte = (i: number) => parseInt(digits.slice(i, i + 2), 16) / 255;
  return { r: byte(0), g: byte(2), b: byte(4), alpha: digits.length === 8 ? byte(6) : 1 };
}

function parseMixStop(text: string): { color: string; weight?: number } {
  const trailing = /^(.*\S)\s+(-?[\d.]+)%$/.exec(text);
  if (trailing) return { color: trailing[1], weight: parseFloat(trailing[2]) / 100 };
  const leading = /^(-?[\d.]+)%\s+(.*)$/.exec(text);
  if (leading) return { color: leading[2], weight: parseFloat(leading[1]) / 100 };
  return { color: text };
}

/** Parses a color with every `var()` already substituted. */
export function parseColor(input: string, currentColor?: Rgba): Rgba | undefined {
  const text = input.trim().toLowerCase();
  if (text === "currentcolor") return currentColor;
  if (NAMED[text]) return NAMED[text];
  if (text.startsWith("#")) return parseHex(text.slice(1));
  const open = text.indexOf("(");
  if (open < 0 || !text.endsWith(")")) return undefined;
  const fn = text.slice(0, open);
  const body = text.slice(open + 1, -1);

  if (fn === "rgb" || fn === "rgba") {
    const parts = body.includes(",") ? splitCommas(body) : body.replace("/", " ").split(/\s+/);
    if (parts.length < 3) return undefined;
    return {
      r: parseNumber(parts[0], 255) / 255,
      g: parseNumber(parts[1], 255) / 255,
      b: parseNumber(parts[2], 255) / 255,
      alpha: parts[3] === undefined ? 1 : parseNumber(parts[3]),
    };
  }

  if (fn === "oklch" || fn === "oklab") {
    const [channels, alphaPart] = body.split("/");
    const [l, x, y] = channels.trim().split(/\s+/);
    const L = parseNumber(l);
    const alpha = alphaPart === undefined ? 1 : parseNumber(alphaPart.trim());
    if (fn === "oklab") return fromOklab([L, parseNumber(x, 0.4), parseNumber(y, 0.4)], alpha);
    const C = parseNumber(x, 0.4);
    const h = (parseNumber(y) * Math.PI) / 180;
    return fromOklab([L, C * Math.cos(h), C * Math.sin(h)], alpha);
  }

  if (fn === "color-mix") {
    const [space, first, second] = splitCommas(body);
    if (!space?.startsWith("in ") || !first || !second) return undefined;
    const a = parseMixStop(first);
    const b = parseMixStop(second);
    const ca = parseColor(a.color, currentColor);
    const cb = parseColor(b.color, currentColor);
    if (!ca || !cb) return undefined;
    let wa = a.weight ?? (b.weight === undefined ? 0.5 : 1 - b.weight);
    let wb = b.weight ?? 1 - wa;
    const total = wa + wb;
    if (total <= 0) return undefined;
    wa /= total;
    wb /= total;
    const scale = Math.min(1, total);
    const alpha = ca.alpha * wa + cb.alpha * wb;
    if (alpha <= 0) return { r: 0, g: 0, b: 0, alpha: 0 };
    if (space.trim() === "in srgb") {
      const mix = (x: number, y: number) => (x * ca.alpha * wa + y * cb.alpha * wb) / alpha;
      return { r: mix(ca.r, cb.r), g: mix(ca.g, cb.g), b: mix(ca.b, cb.b), alpha: alpha * scale };
    }
    const la = toOklab(ca);
    const lb = toOklab(cb);
    const mixed = la.map((v, i) => (v * ca.alpha * wa + lb[i] * cb.alpha * wb) / alpha) as [
      number,
      number,
      number,
    ];
    return fromOklab(mixed, alpha * scale);
  }
  return undefined;
}

export function formatColor({ r, g, b, alpha }: Rgba): string {
  const byte = (c: number) => Math.round(c * 255);
  const a = Math.round(alpha * 1000) / 1000;
  return a >= 1
    ? `rgb(${byte(r)}, ${byte(g)}, ${byte(b)})`
    : `rgba(${byte(r)}, ${byte(g)}, ${byte(b)}, ${a})`;
}

/** Computes one listed source, or `undefined` when a name or color cannot be resolved. */
export function evaluateMix(
  source: string,
  resolve: Resolve,
  currentColor?: Rgba,
): string | undefined {
  const text = substituteVars(source, resolve);
  if (text === undefined) return undefined;
  const color = parseColor(text, currentColor);
  return color && formatColor(color);
}

interface Sources {
  list: string[];
  literals: Map<string, string>;
}

function readSources(doc: Document): Sources {
  const list: string[] = [];
  const literals = new Map<string, string>();
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ("cssRules" in rule && !("selectorText" in rule)) {
        visit((rule as CSSGroupingRule).cssRules);
        continue;
      }
      if (!("selectorText" in rule)) continue;
      const { selectorText, style } = rule as CSSStyleRule;
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (!name.startsWith("--")) continue;
        const value = style.getPropertyValue(name).trim();
        if (selectorText === MIX_SOURCE_SELECTOR && name.startsWith(SOURCE_PREFIX)) {
          list[Number(name.slice(SOURCE_PREFIX.length))] = value;
        } else if (!literals.has(name) && value && !value.includes("var(")) {
          literals.set(name, value);
        }
      }
    }
  };
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // A cross-origin sheet cannot be read and has no listed sources.
    }
  }
  return { list, literals };
}

function scopeKey(el: Element): string {
  return `${el.getAttribute("data-theme")}|${el.getAttribute("data-style")}`;
}

/**
 * Feature-detects and, only where needed, fills in `--pc-dvh` and the
 * `--pc-mix-N` colors. Returns a cleanup function.
 */
export function installLegacyWebViewShim(win: Window & typeof globalThis = window): () => void {
  const doc = win.document;
  const supports = (prop: string, value: string) => win.CSS?.supports?.(prop, value) ?? false;
  if (!supports("height", "1dvh")) doc.documentElement.style.setProperty("--pc-dvh", "1vh");
  if (supports("color", "color-mix(in oklab, red, red)")) return () => {};

  const { list, literals } = readSources(doc);
  if (list.length === 0) return () => {};
  const entries = [
    ...list.map((source, index) => ({ name: `--pc-mix-${index}`, source })),
    ...PIPE_LAYERS.map((layer) => ({ name: pipeLayerVar(layer), source: pipeLayerMix(layer) })),
  ];
  const applied = new WeakMap<Element, string>();

  const fill = (el: HTMLElement) => {
    // A mix can read a theme variable that is itself a mix, so settle in passes.
    for (let pass = 0; pass < 4; pass++) {
      const style = win.getComputedStyle(el);
      const resolve: Resolve = (name) => style.getPropertyValue(name).trim() || literals.get(name);
      const current = parseColor(style.color);
      const values = entries.map(({ source }) =>
        source ? evaluateMix(source, resolve, current) : undefined,
      );
      let changed = false;
      values.forEach((value, index) => {
        const { name } = entries[index]!;
        if (value === undefined || el.style.getPropertyValue(name) === value) return;
        el.style.setProperty(name, value);
        changed = true;
      });
      if (!changed) break;
    }
    applied.set(el, scopeKey(el));
  };

  let frame = 0;
  const run = () => {
    frame = 0;
    const scopes = [
      doc.documentElement,
      ...Array.from(doc.querySelectorAll<HTMLElement>(SCOPE_SELECTOR)),
    ];
    for (const el of scopes) {
      if (applied.get(el) !== scopeKey(el)) fill(el);
    }
  };
  run();

  const observer = new win.MutationObserver(() => {
    if (!frame) frame = win.requestAnimationFrame(run);
  });
  observer.observe(doc.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-theme", "data-style"],
  });
  return () => {
    observer.disconnect();
    if (frame) win.cancelAnimationFrame(frame);
  };
}
