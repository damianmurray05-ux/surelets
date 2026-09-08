// The website is served from GitHub Pages and the assistant from Vercel, so
// the browser makes cross-origin requests. Only our own origins are allowed.
const ALLOWED = new Set([
  "https://surelets.co.uk",
  "https://www.surelets.co.uk",
  "https://damianmurray05-ux.github.io",
  "http://localhost:4322",
  "http://127.0.0.1:4322",
]);
const extra = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
extra.forEach((o) => ALLOWED.add(o));

export function corsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const ok = ALLOWED.has(origin) || /^https:\/\/surelets[a-z0-9-]*\.vercel\.app$/.test(origin);
  return ok
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "origin" }
    : {};
}

export const preflight = (request) => new Response(null, { status: 204, headers: corsHeaders(request) });
