(function(win){function installDebugBarStrip(win) {
  const doc = win?.document;
  if (!doc) return false;
  if (win.__pcStripDebugBar) return true;
  if (!doc.documentElement) {
    if (!win.__pcStripDebugWait) {
      win.__pcStripDebugWait = true;
      const retry = () => {
        win.__pcStripDebugWait = false;
        installDebugBarStrip(win);
      };
      doc.addEventListener?.("DOMContentLoaded", retry, { once: true });
      win.setTimeout?.(retry, 0);
    }
    return false;
  }
  win.__pcStripDebugBar = true;
  let sweeping = false;
  let again = false;
  const sweep = () => {
    if (sweeping) {
      again = true;
      return;
    }
    sweeping = true;
    try {
      removeDebugBars(win);
    } catch {
      /* keep watching if one pass fails */
    } finally {
      sweeping = false;
      if (again) {
        again = false;
        sweep();
      }
    }
  };
  sweep();
  const root = doc.documentElement;
  if (root && typeof win.MutationObserver === "function") {
    const observer = new win.MutationObserver(sweep);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }
  const every = win.setInterval || ((fn) => win.setTimeout?.(fn, 400));
  every(sweep, 400);
  return true;
}function removeDebugBars(win) {
  const doc = win?.document;
  if (!doc) return 0;
  const debugId = "pc-android-debug";
  let removed = 0;
  const drop = (node) => {
    if (!node || node.__pcDropped) return;
    node.__pcDropped = true;
    try {
      if (node.style && typeof node.style.setProperty === "function") {
        node.style.setProperty("display", "none", "important");
      }
    } catch {
      /* hiding is a backup for remove */
    }
    if (typeof node.remove === "function") node.remove();
    else node.parentNode?.removeChild?.(node);
    removed += 1;
  };

  const known = doc.getElementById?.(debugId);
  if (known) drop(known);

  const root = doc.documentElement || doc.body;
  const all = root?.querySelectorAll?.("*") || [];
  for (const el of all) {
    if (!el || el.__pcDropped) continue;
    if (el.id === debugId) {
      drop(el);
      continue;
    }
    const tag = String(el.tagName || "").toLowerCase();
    if (tag === "script" || tag === "style" || tag === "noscript") continue;
    if (isDebugBar(el, win)) drop(el);
  }
  return removed;
}function textOf(el) {
  return String(el?.textContent || el?.innerText || "").toLowerCase();
}function isGameChrome(el) {
  const cls = String(el?.className?.baseVal || el?.className || "");
  return /\bpc-(bottom|shell|board|tray|stage|scene|footer|note|ad|hint)\b/.test(cls);
}function isDebugBar(el, win) {
  if (!el || isGameChrome(el)) return false;
  const text = textOf(el);
  if (!text.includes("board") || !text.includes("cell")) return false;
  return isBlack(backgroundOf(el, win)) && sitsAtBottom(el, win);
}function backgroundOf(el, win) {
  const computed = win.getComputedStyle?.(el)?.backgroundColor;
  if (computed && computed !== "transparent" && computed !== "rgba(0, 0, 0, 0)") return computed;
  return String(el.style?.backgroundColor || el.style?.background || el.getAttribute?.("style") || "");
}function isBlack(color) {
  const value = String(color || "").toLowerCase();
  if (!value || value === "transparent") return false;
  if (value === "black" || value === "#000" || value === "#000000") return true;
  if (/background(?:-color)?\s*:\s*(#000(?:000)?\b|black\b)/.test(value)) return true;
  const match = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([0-9.]+))?/.exec(value);
  if (!match) return false;
  const alpha = match[4] == null ? 1 : Number(match[4]);
  if (!(alpha > 0.4)) return false;
  return Number(match[1]) <= 48 && Number(match[2]) <= 48 && Number(match[3]) <= 48;
}function sitsAtBottom(el, win) {
  const doc = win.document;
  const view = win.innerHeight || doc?.documentElement?.clientHeight || doc?.body?.clientHeight || 0;
  const style = win.getComputedStyle?.(el) || {};
  const rect = el.getBoundingClientRect?.();
  const height = rect?.height || parseFloat(style.height) || parseFloat(el.style?.height) || 0;
  if (height > 120) return false;
  if (rect && view > 0 && height > 0 && rect.bottom >= view - 48 && rect.top >= view - 200) return true;
  const pos = String(style.position || el.style?.position || "");
  if (pos === "fixed" || pos === "absolute" || pos === "sticky") {
    const bottom = style.bottom ?? el.style?.bottom;
    if (bottom != null && bottom !== "" && bottom !== "auto") {
      const n = parseFloat(bottom);
      if (!Number.isFinite(n) || n <= 80) return true;
    }
  }
  return false;
}try{installDebugBarStrip(win)}catch(e){}})(window);
