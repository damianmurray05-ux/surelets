// The website is served from GitHub Pages and the assistant from Vercel, so
// the browser makes cross-origin requests. Only our own origins are allowed.
// Pages served by Vercel itself (production and previews) call the functions
// on their own host, which needs no CORS header at all, so no wildcard for
// *.vercel.app is needed: anyone can register a project name there.
const ALLOWED = new Set([
  "https://surelets.co.uk",
  "https://www.surelets.co.uk",
  "https://surelets.vercel.app",
  "https://damianmurray05-ux.github.io",
  "http://localhost:4322",
  "http://127.0.0.1:4322",
]);
const extra = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
extra.forEach((o) => ALLOWED.add(o));

const sameHost = (request, origin) => {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  try { return Boolean(host) && new URL(origin).host === host; } catch { return false; }
};

/* True when a browser on someone else's site is calling us. Requests with no
   Origin header (server to server, curl, health checks) are not browsers and
   are limited by rate limiting instead. */
export function foreignOrigin(request) {
  const origin = request.headers.get("origin") || "";
  if (!origin) return false;
  return !(ALLOWED.has(origin) || sameHost(request, origin));
}

export function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  return ALLOWED.has(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" }
    : {};
}

export const preflight = (request) => new Response(null, { status: foreignOrigin(request) ? 403 : 204, headers: corsHeaders(request) });
