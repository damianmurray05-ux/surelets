// Outbound messages: email through Resend, SMS through Twilio, and an
// optional webhook (Zapier, Make, Trello) for every raised job.
// Each is switched on by its environment variables and silently skipped
// otherwise, so the site keeps working before they are configured.

const FROM = process.env.MAIL_FROM || "Sure Lets & Manage <assistant@surelets.co.uk>";
export const TEAM_EMAIL = process.env.TEAM_EMAIL || "admin@surelets.co.uk";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);
export const smsConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

export async function sendEmail({ to, subject, text, html, attachments = [], replyTo }) {
  if (!emailConfigured()) return { ok: false, skipped: true };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html: html || `<pre style="font: 14px/1.5 -apple-system, Segoe UI, sans-serif; white-space: pre-wrap">${escapeHtml(text)}</pre>`,
      reply_to: replyTo,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.data })),
    }),
  });
  if (!r.ok) return { ok: false, error: `resend ${r.status}: ${(await r.text()).slice(0, 200)}` };
  return { ok: true };
}

export async function sendSms({ to, text }) {
  if (!smsConfigured()) return { ok: false, skipped: true };
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: text }),
  });
  if (!r.ok) return { ok: false, error: `twilio ${r.status}: ${(await r.text()).slice(0, 200)}` };
  return { ok: true };
}

export async function postWebhook(payload) {
  const url = process.env.MAINTENANCE_WEBHOOK_URL;
  if (!url) return { ok: false, skipped: true };
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    return { ok: r.ok };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
