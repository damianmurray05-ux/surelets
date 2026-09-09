#!/usr/bin/env node
// One-off: turn a Zoho Self Client grant code into a refresh token.
//
//   node scripts/zoho-token.mjs <client id> <client secret> <grant code> [dc]
//
// dc is eu (default), com, in, au, jp, uk or ca, matching the Zoho account.
// Writes the three values Vercel needs to zoho.env next to this script and
// prints nothing secret to the terminal. Paste them into Vercel as
// ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET and ZOHO_REFRESH_TOKEN, then delete the file.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [id, secret, code, dc = "eu"] = process.argv.slice(2);
if (!id || !secret || !code) {
  console.error("usage: node scripts/zoho-token.mjs <client id> <client secret> <grant code> [dc]");
  process.exit(1);
}
const r = await fetch(`https://accounts.zoho.${dc}/oauth/v2/token`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "authorization_code", client_id: id, client_secret: secret, code }),
});
const d = await r.json();
if (!d.refresh_token) {
  console.error("Zoho did not return a refresh token:", d.error || JSON.stringify(d));
  console.error("Grant codes expire after a few minutes; generate a new one and try again.");
  process.exit(1);
}
const out = join(dirname(fileURLToPath(import.meta.url)), "zoho.env");
writeFileSync(out, `ZOHO_CLIENT_ID=${id}\nZOHO_CLIENT_SECRET=${secret}\nZOHO_REFRESH_TOKEN=${d.refresh_token}\nZOHO_DC=${dc}\n`, { mode: 0o600 });
console.log(`Done. The three values are in ${out}. Paste them into Vercel, then delete that file.`);
