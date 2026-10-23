/**
 * Dev/preview: insert the Google Ads tag immediately after `<head>` on
 * document responses. Production uses server/middleware/google-ads-tag.ts.
 */
import { acceptsHtml, isDocumentPath, isInstallQuery } from "./grok-pwa-shared.mjs";
import { createGoogleAdsTagInserter } from "./google-ads-tag.mjs";

function wrapHtmlResponses(middlewares) {
  middlewares.use((req, res, next) => {
    const rawUrl = req.url ?? "";
    const pathOnly = rawUrl.split("?", 1)[0] ?? "";
    const method = (req.method ?? "GET").toUpperCase();
    const looksLikeDocument =
      method === "GET" &&
      acceptsHtml(req.headers.accept) &&
      !isInstallQuery(rawUrl) &&
      isDocumentPath(pathOnly);
    if (!looksLikeDocument) {
      next();
      return;
    }

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const inserter = createGoogleAdsTagInserter();
    let mode = null;

    const decideMode = () => {
      if (mode) return mode;
      const isHtml = String(res.getHeader("content-type") ?? "").includes("text/html");
      const encoded = Boolean(res.getHeader("content-encoding"));
      mode = isHtml && !encoded ? "inject" : "passthrough";
      if (mode === "inject" && !res.headersSent) res.removeHeader("content-length");
      return mode;
    };

    const toString = (chunk, encoding) => {
      if (typeof chunk === "string") return chunk;
      if (Buffer.isBuffer(chunk)) return chunk.toString(typeof encoding === "string" ? encoding : "utf8");
      return Buffer.from(chunk).toString("utf8");
    };

    res.write = (chunk, encoding, cb) => {
      if (decideMode() === "passthrough") return originalWrite(chunk, encoding, cb);
      const done = typeof encoding === "function" ? encoding : cb;
      if (chunk) {
        const out = inserter.push(toString(chunk, encoding));
        if (out) originalWrite(out);
      }
      if (typeof done === "function") done();
      return true;
    };

    res.end = (chunk, encoding, cb) => {
      const done = typeof encoding === "function" ? encoding : cb;
      if (decideMode() === "passthrough") return originalEnd(chunk, encoding, cb);
      if (chunk) {
        const out = inserter.push(toString(chunk, encoding));
        if (out) originalWrite(out);
      }
      const rest = inserter.flush();
      if (rest) originalWrite(rest);
      return originalEnd(undefined, undefined, done);
    };

    next();
  });
}

export function googleAdsTagPlugin() {
  return {
    name: "app-builder:google-ads-tag",
    configureServer(server) {
      wrapHtmlResponses(server.middlewares);
    },
    configurePreviewServer(server) {
      return () => {
        wrapHtmlResponses(server.middlewares);
      };
    },
  };
}
