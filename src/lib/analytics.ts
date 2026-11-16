/** Google Analytics 4 for the website and the Capacitor apps that load it. */
export const GA_MEASUREMENT_ID = "G-JXCS90M1KC";

export const GA_SCRIPT_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

/**
 * Queues hits until gtag.js arrives. Leaves an existing tag in place so a
 * second snippet cannot replace the sender.
 */
export function gaBootstrap(): string {
  return `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function gtag(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config','${GA_MEASUREMENT_ID}');`;
}

export type AnalyticsValue = string | number | boolean;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __pcAnalytics?: boolean;
  }
}

function ensureStub() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments);
    };
  }
}

/** Configures the property. Safe to call during render; it does not touch the document. */
export function installAnalytics() {
  if (typeof window === "undefined" || window.__pcAnalytics) return;
  window.__pcAnalytics = true;
  ensureStub();
  window.gtag!("js", new Date());
  window.gtag!("config", GA_MEASUREMENT_ID);
}

/** Loads gtag.js when the page does not already include it. */
export function loadAnalyticsScript() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${GA_SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = GA_SCRIPT_SRC;
  document.head.appendChild(script);
}

function clientId(): string {
  const fromCookie =
    typeof document !== "undefined" ? document.cookie.match(/_ga=GA\d+\.\d+\.(\d+\.\d+)/)?.[1] : undefined;
  if (fromCookie) return fromCookie;
  const key = "pc-ga-cid";
  try {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const created = `${Math.floor(Math.random() * 1e9)}.${Math.floor(Date.now() / 1000)}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `0.${Math.floor(Date.now() / 1000)}`;
  }
}

/**
 * Sends the hit straight to this property. The page may already have another
 * tag on the same dataLayer, and that tag does not forward later events here.
 */
function sendCollect(name: string, params?: Record<string, AnalyticsValue>) {
  if (typeof document === "undefined") return;
  const query = new URLSearchParams({
    v: "2",
    tid: GA_MEASUREMENT_ID,
    cid: clientId(),
    en: name,
    dl: typeof location !== "undefined" ? location.href : "",
  });
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      query.set(typeof value === "number" ? `epn.${key}` : `ep.${key}`, String(value));
    }
  }
  const url = `https://www.google-analytics.com/g/collect?${query.toString()}`;
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url);
    return;
  }
  if (typeof fetch === "function") void fetch(url, { method: "POST", mode: "no-cors", keepalive: true });
}

/** Sends one event. Does nothing during server render. */
export function track(name: string, params?: Record<string, AnalyticsValue>) {
  if (typeof window === "undefined") return;
  sendCollect(name, params);
}

export function trackLevelStart(level: number) {
  track("level_start", { level });
}

export function trackLevelComplete(level: number) {
  track("level_complete", { level });
}

export function trackHintUsed(mode: "levels" | "daily", level: number) {
  track("hint_used", { mode, level });
}

export function trackDailyPlayed() {
  track("daily_puzzle_played");
}
