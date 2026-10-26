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

function requestHosts(request: Request) {
  const hosts = new Set<string>();
  const host = request.headers.get("host");
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (host) hosts.add(host);
  if (forwarded) hosts.add(forwarded);
  return hosts;
}

export async function rememberSession(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    const hosts = requestHosts(request);
    if (hosts.size > 0 && !hosts.has(originHost)) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  const { auth, DONT_REMEMBER_COOKIE, SESSION_TOKEN_COOKIE } = await import("@/lib/auth/server");
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
  headers.append("set-cookie", setCookieHeader(DONT_REMEMBER_COOKIE, "", 0));
  return Response.json({ ok: true }, { headers });
}
