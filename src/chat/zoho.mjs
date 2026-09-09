// Live tenant lookup in Zoho CRM. Tenancies live in the Contacts module
// (labelled "Tenant" in the CRM). Each record is one tenancy: the property is
// the linked Account, the rent payment reference is the code the tenant
// already uses when paying rent, and Status says whether the tenancy is
// current. Nothing from the CRM is stored here; every lookup is live.
//
// Environment:
//   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET   a Self Client from the Zoho API console
//   ZOHO_REFRESH_TOKEN                   from scripts/zoho-token.mjs
//   ZOHO_DC                              eu (default), com, in, au, jp, uk, ca

const DC = (process.env.ZOHO_DC || "eu").toLowerCase();
const ACCOUNTS = `https://accounts.zoho.${DC}`;
const API = `https://www.zohoapis.${DC}/crm/v8`;

// Tenancies in these states may verify and report repairs.
export const CURRENT_STATUSES = new Set(["Tenanted", "Arrears", "Possession Proceedings", "Court", "Let Agreed", "Maintenance Only"]);

const FIELDS = "id,Last_Name,Full_Name,Email,Tenant_1_Name,Tenant_1_Phone,Tenant_1_Phone1,Tenant_2_Name,Tenant_2_Email,Tenant_2_Phone,Mobile,Phone,Status,Account_Name,Rent_Payment_Reference,Property_Sauce_Reference,Homelet_Number";

let token = { value: null, exp: 0 };

export const zohoConfigured = () => Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN);

async function accessToken() {
  if (token.value && Date.now() < token.exp - 60_000) return token.value;
  const r = await fetch(`${ACCOUNTS}/oauth/v2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    }),
  });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(`zoho token: ${d.error || r.status}`);
  token = { value: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
  return token.value;
}

async function search(criteria) {
  const t = await accessToken();
  const url = `${API}/Contacts/search?criteria=${encodeURIComponent(criteria)}&fields=${FIELDS}&per_page=20`;
  const r = await fetch(url, { headers: { authorization: `Zoho-oauthtoken ${t}` } });
  if (r.status === 204) return [];
  const d = await r.json();
  if (!r.ok) throw new Error(`zoho search ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d.data || [];
}

/* The reference a tenant types: letters and digits only, upper case. */
export const normaliseRef = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/* UK mobile numbers to E.164 so Twilio accepts them. */
export function normalisePhone(p) {
  let s = String(p || "").replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  if (s.startsWith("0")) return "+44" + s.slice(1);
  if (s.startsWith("44")) return "+" + s;
  return "+44" + s;
}

/* Map one CRM record to what the assistant needs. Exported for tests. */
export function mapRecord(rec) {
  const status = rec.Status || "";
  const lastName = rec.Last_Name || rec.Full_Name || "";
  const [addrFromName, nameFromName] = lastName.includes(" - ") ? lastName.split(" - ", 2) : ["", lastName];
  const name = (rec.Tenant_1_Name || nameFromName || "").trim();
  const address = (rec.Account_Name && rec.Account_Name.name) || addrFromName.trim();
  const email = (rec.Email || rec.Tenant_2_Email || "").trim();
  const phone = normalisePhone(rec.Tenant_1_Phone || rec.Mobile || rec.Tenant_1_Phone1 || rec.Tenant_2_Phone || rec.Phone);
  return {
    id: rec.id,
    reference: rec.Rent_Payment_Reference || rec.Property_Sauce_Reference || rec.Homelet_Number || "",
    name,
    firstName: name.split(/\s+/)[0] || "there",
    email,
    phone,
    address,
    status,
    current: CURRENT_STATUSES.has(status) && !/^\s*X\b/i.test(lastName),
    notes: rec.Tenant_2_Name ? `Joint tenancy with ${rec.Tenant_2_Name}` : "",
  };
}

/* Find a current tenancy by the reference the tenant quotes. Returns null
   for unknown references and for tenancies that have ended. */
export async function findTenantInZoho(reference) {
  const want = normaliseRef(reference);
  if (want.length < 4) return null;
  const crit = `((Rent_Payment_Reference:equals:${want})or(Property_Sauce_Reference:equals:${want})or(Homelet_Number:equals:${want}))`;
  let rows = await search(crit);
  if (!rows.length) {
    // Tenants sometimes type the reference with spaces or dashes; the CRM value may too.
    rows = (await search(`(Rent_Payment_Reference:starts_with:${want.slice(0, 5)})`)).filter((r) => normaliseRef(r.Rent_Payment_Reference) === want);
  }
  const mapped = rows.map(mapRecord).filter((t) => t.current);
  return mapped[0] || null;
}
