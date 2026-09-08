// The tenant directory: who holds which tenancy reference, and how to reach
// them. Never committed to the repository. Provide it one of two ways:
//   TENANT_DIRECTORY_URL  a CSV or JSON file the function can fetch, for
//                         example a Google Sheet published to the web as CSV
//   TENANT_DIRECTORY_JSON the same data inline as a JSON array
// Columns / keys: reference, name, email, phone, address, notes (optional).
// See docs/tenant-directory-template.csv.

let cache = { at: 0, rows: [] };
const TTL = 5 * 60 * 1000;

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v.trim()));
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

export const normaliseRef = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

async function loadRows() {
  if (Date.now() - cache.at < TTL && cache.rows.length) return cache.rows;
  let rows = [];
  if (process.env.TENANT_DIRECTORY_JSON) {
    rows = JSON.parse(process.env.TENANT_DIRECTORY_JSON);
  } else if (process.env.TENANT_DIRECTORY_URL) {
    const r = await fetch(process.env.TENANT_DIRECTORY_URL, { headers: { "cache-control": "no-cache" } });
    if (!r.ok) throw new Error(`directory fetch failed: ${r.status}`);
    const text = await r.text();
    rows = text.trim().startsWith("[") ? JSON.parse(text) : parseCsv(text);
  }
  cache = { at: Date.now(), rows };
  return rows;
}

export function directoryConfigured() {
  return Boolean(process.env.TENANT_DIRECTORY_JSON || process.env.TENANT_DIRECTORY_URL);
}

export async function findTenant(reference) {
  const want = normaliseRef(reference);
  if (!want) return null;
  const rows = await loadRows();
  const row = rows.find((r) => normaliseRef(r.reference) === want);
  if (!row) return null;
  return {
    reference: String(row.reference).trim(),
    name: row.name || "",
    firstName: (row.name || "").split(/\s+/)[0] || "there",
    email: (row.email || "").trim(),
    phone: (row.phone || "").replace(/[\s()-]/g, ""),
    address: row.address || "",
    notes: row.notes || "",
  };
}

export const maskEmail = (e) => {
  if (!e) return "";
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
};
export const maskPhone = (p) => (p ? `${"*".repeat(Math.max(0, p.length - 3))}${p.slice(-3)}` : "");
