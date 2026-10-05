/**
 * Production 500 body includes the exception text. Nitro's default handler
 * drops `error.message` on unhandled errors, which hides the crash.
 */
export default function errorHandler(error: unknown) {
  let message = "error";
  let code = "";
  let cause = "";
  let stack = "";
  try {
    const err = error as {
      message?: unknown;
      code?: unknown;
      stack?: unknown;
      cause?: { message?: unknown; code?: unknown; stack?: unknown };
    };
    message = String(err?.message ?? message);
    code = String(err?.code ?? err?.cause?.code ?? "");
    cause = String(err?.cause?.message ?? "");
    const rawStack = err?.stack ?? err?.cause?.stack ?? "";
    stack = String(rawStack).split("\n").slice(0, 8).join("\n");
  } catch (inner) {
    message = inner instanceof Error ? inner.message : "error-handler failed";
  }
  return new Response(
    JSON.stringify({ error: true, status: 500, diag: "v2", message, code, cause, stack }, null, 2),
    {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}
