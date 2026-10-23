/**
 * Production HTML documents get one Google Ads tag immediately after `<head>`.
 * Dev and vite preview use scripts/google-ads-tag-plugin.mjs.
 */
import { createGoogleAdsTagInserter } from "../../scripts/google-ads-tag.mjs";

interface GoogleAdsEvent {
  req: { method: string };
}

export default async function googleAdsTagMiddleware(
  event: GoogleAdsEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const method = (event.req.method ?? "GET").toUpperCase();
  if (method !== "GET") return next();

  const result = await next();
  if (
    !(result instanceof Response) ||
    !result.body ||
    !String(result.headers.get("content-type") ?? "").includes("text/html") ||
    result.headers.get("content-encoding")
  ) {
    return result;
  }

  const inserter = createGoogleAdsTagInserter();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const transformed = result.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = inserter.push(decoder.decode(chunk, { stream: true }));
        if (text) controller.enqueue(encoder.encode(text));
      },
      flush(controller) {
        const text = inserter.flush() + decoder.decode();
        if (text) controller.enqueue(encoder.encode(text));
      },
    }),
  );
  const headers = new Headers(result.headers);
  headers.delete("content-length");
  return new Response(transformed, {
    status: result.status,
    statusText: result.statusText,
    headers,
  });
}
