/** Remember-me length. Unchecked logins keep Better Auth's normal 7-day session. */
export const STAY_LOGGED_IN_SECONDS = 30 * 24 * 60 * 60;
const SESSION_DATA_COOKIE = "__Host-grok-auth.session_data";

function cookieValue(header: string, name: string) {
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return null;
}

function setCookieHeader(name: string, value: string, maxAge: number) {
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  return `${name}=${value}; Path=/; Expires=${expires}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export async function rememberSession(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { auth, SESSION_TOKEN_COOKIE } = await import("@/lib/auth/server");
  const session = await auth.api.getSession({ headers: request.headers });
  const token = session?.session?.token;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const raw = cookieValue(request.headers.get("cookie") || "", SESSION_TOKEN_COOKIE);
  if (!raw) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await auth.$context;
  const expiresAt = new Date(Date.now() + STAY_LOGGED_IN_SECONDS * 1000);
  await ctx.internalAdapter.updateSession(token, { expiresAt });

  const headers = new Headers();
  headers.append("set-cookie", setCookieHeader(SESSION_TOKEN_COOKIE, raw, STAY_LOGGED_IN_SECONDS));
  headers.append("set-cookie", setCookieHeader(SESSION_DATA_COOKIE, "", 0));
  return Response.json({ ok: true }, { headers });
}
