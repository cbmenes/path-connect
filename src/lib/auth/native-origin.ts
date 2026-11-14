/**
 * Better Auth rejects any base URL that is not http(s). Capacitor iOS serves
 * the bundled client at `capacitor://localhost`, and that check runs while the
 * router module loads, so the WebView stays blank. The game does not sign in
 * from the native shell. A loopback http base lets the client start. Website
 * and PWA origins are already http(s), so they keep using their own origin.
 */
export function authClientBaseURL(origin: string | null | undefined): string | undefined {
  if (!origin || origin.startsWith("http://") || origin.startsWith("https://")) return undefined;
  return "http://localhost";
}
