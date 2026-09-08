import { test } from "node:test";
import assert from "node:assert/strict";

process.env.CHAT_SECRET = "test-secret-for-the-suite";
process.env.TENANT_DIRECTORY_JSON = JSON.stringify([{ reference: "SL-1001", name: "Test Tenant", email: "t@example.com", phone: "+447700900000", address: "1 Test Street" }]);

const { sign, verify, otp, hashCode, reference } = await import("../src/chat/crypto.mjs");
const { findTenant, normaliseRef, maskEmail, maskPhone } = await import("../src/chat/directory.mjs");
const { systemPrompt } = await import("../src/chat/prompt.mjs");
const { knowledge } = await import("../src/chat/knowledge.mjs");
const { corsHeaders } = await import("../src/chat/cors.mjs");

test("tokens round-trip and reject tampering", () => {
  const t = sign({ t: "session", ref: "SL-1001", exp: Date.now() + 1000 });
  assert.equal(verify(t).ref, "SL-1001");
  assert.equal(verify(t.slice(0, -2) + "zz"), null);
  assert.equal(verify(sign({ exp: Date.now() - 1 })).expired, true);
});

test("codes are six digits and hash per reference", () => {
  const c = otp();
  assert.match(c, /^\d{6}$/);
  assert.notEqual(hashCode("SL-1", c), hashCode("SL-2", c));
  assert.match(reference(), /^SL-\d{6}-\d{3}$/);
});

test("directory lookup is case and punctuation insensitive", async () => {
  assert.equal(normaliseRef(" sl-1001 "), "SL1001");
  const t = await findTenant("sl 1001");
  assert.equal(t.firstName, "Test");
  assert.equal(await findTenant("SL-9999"), null);
  assert.equal(maskEmail("tenant@example.com"), "te****@example.com");
  assert.equal(maskPhone("+447700900000"), "**********000");
});

test("prompt carries the verified tenant and the house rules", () => {
  const p = systemPrompt({ mode: "repair", tenant: { name: "Test Tenant", address: "1 Test Street", reference: "SL-1001" } });
  assert.match(p, /verified tenant/);
  assert.match(p, /1 Test Street/);
  assert.match(p, /Never invent facts/);
  assert.ok(!/[–—]/.test(knowledge), "knowledge must not contain dashes");
});

test("cors allows our origins only", () => {
  const h = (o) => corsHeaders({ headers: new Map([["origin", o]]) });
  assert.equal(h("https://surelets.co.uk")["access-control-allow-origin"], "https://surelets.co.uk");
  assert.equal(h("https://surelets-git-main.vercel.app")["access-control-allow-origin"], "https://surelets-git-main.vercel.app");
  assert.equal(h("https://evil.example")["access-control-allow-origin"], undefined);
});
