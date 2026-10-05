/**
 * Temporary production error body so a Vercel 500 includes the exception
 * text. Nitro's default handler hides `error.message` whenever `unhandled`
 * is set, which is every non-HTTPError.
 */
export default function errorHandler(error: {
  message?: string;
  stack?: string;
  code?: string;
  cause?: { message?: string; code?: string; stack?: string };
}) {
  const cause = error?.cause;
  const body = {
    error: true,
    status: 500,
    message: error?.message ?? "error",
    code: error?.code ?? cause?.code ?? "",
    cause: cause?.message ?? "",
    stack: (error?.stack ?? cause?.stack ?? "").split("\n").slice(0, 8).join("\n"),
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: 500,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
