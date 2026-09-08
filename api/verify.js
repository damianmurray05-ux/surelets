// Tenant verification. Stateless: the challenge is a signed token holding a
// hash of the code and an expiry; the session is a signed token holding the
// tenant's details. POST { action: "lookup" | "start" | "check", ... }
import { findTenant, directoryConfigured, maskEmail, maskPhone } from "../src/chat/directory.mjs";
import { sign, verify, otp, hashCode } from "../src/chat/crypto.mjs";
import { sendEmail, sendSms, emailConfigured, smsConfigured } from "../src/chat/notify.mjs";
import { limit } from "../src/chat/ratelimit.mjs";
import { corsHeaders, preflight } from "../src/chat/cors.mjs";

const devEcho = () => process.env.CHAT_DEV_ECHO_CODE === "1" && !String(process.env.VERCEL_ENV || "").startsWith("prod");

export async function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(request) } });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!limit(`verify:${ip}`, 20, 10 * 60 * 1000)) return json(429, { error: "rate_limited" });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: "bad_json" }); }

  if (!directoryConfigured()) return json(503, { error: "verification_unavailable" });

  if (body.action === "lookup") {
    const t = await findTenant(body.reference);
    if (!t) return json(404, { error: "not_found" });
    const channels = { email: (emailConfigured() || devEcho()) && t.email ? maskEmail(t.email) : null, phone: (smsConfigured() || devEcho()) && t.phone ? maskPhone(t.phone) : null };
    if (!channels.email && !channels.phone) return json(503, { error: "verification_unavailable" });
    return json(200, channels);
  }

  if (body.action === "start") {
    const t = await findTenant(body.reference);
    if (!t) return json(404, { error: "not_found" });
    const code = otp();
    const exp = Date.now() + 10 * 60 * 1000;
    const token = sign({ t: "challenge", ref: t.reference, h: hashCode(t.reference, code), exp, ch: body.channel });
    let sent;
    if (devEcho() && !emailConfigured() && !smsConfigured()) sent = { ok: true };
    else if (body.channel === "sms" && t.phone) {
      sent = await sendSms({ to: t.phone, text: `Sure Lets & Manage: your verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore it.` });
    } else if (t.email) {
      sent = await sendEmail({ to: t.email, subject: `Your Sure Lets & Manage code: ${code}`, text: `Your one-time code is ${code}.\n\nEnter it in the assistant on surelets.co.uk to continue. It expires in 10 minutes. If you did not request this, ignore this email.\n\nSure Lets & Manage` });
    } else return json(400, { error: "no_channel" });
    if (!sent.ok) {
      if (sent.error) console.error("code send failed", sent.error);
      return json(503, { error: "send_failed" });
    }
    const res = { ok: true, token };
    if (devEcho()) res.devCode = code;
    return json(200, res);
  }

  if (body.action === "check") {
    if (!limit(`check:${ip}`, 10, 10 * 60 * 1000)) return json(429, { error: "rate_limited" });
    const ch = verify(body.token);
    if (!ch || ch.t !== "challenge") return json(400, { error: "bad_token" });
    if (ch.expired) return json(410, { error: "expired" });
    const code = String(body.code || "").replace(/\D/g, "");
    if (code.length !== 6 || hashCode(ch.ref, code) !== ch.h) return json(400, { error: "wrong_code" });
    const t = await findTenant(ch.ref);
    if (!t) return json(404, { error: "not_found" });
    const session = sign({ t: "session", ref: t.reference, name: t.name, address: t.address, email: t.email, phone: t.phone, exp: Date.now() + 2 * 60 * 60 * 1000 });
    return json(200, { ok: true, session, tenant: { firstName: t.firstName, address: t.address } });
  }

  return json(400, { error: "bad_action" });
}
