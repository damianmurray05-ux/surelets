// Signed, stateless tokens. Nothing is stored server-side between requests:
// a verification challenge and a verified session are both HMAC-signed
// payloads the browser hands back. The secret lives in CHAT_SECRET.
import { createHmac, randomInt, timingSafeEqual, randomBytes } from "node:crypto";

let secret = process.env.CHAT_SECRET;
if (!secret) {
  secret = randomBytes(32).toString("hex");
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) console.warn("CHAT_SECRET is not set; tokens will not survive a cold start");
}

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const hmac = (s) => createHmac("sha256", secret).update(s).digest();

export function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  return `${body}.${b64u(hmac(body))}`;
}

export function verify(token) {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = hmac(body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return { expired: true };
    return payload;
  } catch { return null; }
}

export const otp = () => String(randomInt(0, 1000000)).padStart(6, "0");
export const hashCode = (reference, code) => b64u(hmac(`${reference}:${code}`));
export const reference = () => `SL-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomInt(100, 999)}`;
