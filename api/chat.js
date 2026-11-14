// The assistant. POST { mode, session, messages } -> { reply, raised, done }
// Stateless: the browser keeps the transcript and sends it each turn. The
// verified tenant comes from the signed session, never from the transcript.
import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "../src/chat/prompt.mjs";
import { tools, runTool } from "../src/chat/tools.mjs";
import { verify } from "../src/chat/crypto.mjs";
import { limit } from "../src/chat/ratelimit.mjs";
import { corsHeaders, preflight, foreignOrigin } from "../src/chat/cors.mjs";
import { sanitise } from "../src/chat/messages.mjs";

const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5";
const MODES = new Set(["repair", "repair-unverified", "tenancy", "landlord"]);
const PHONE = "+44 (0)20 8158 8434";

export async function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(request) } });
  if (foreignOrigin(request)) return json(403, { error: "forbidden_origin" });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!limit(`chat:${ip}`, 40, 10 * 60 * 1000)) return json(429, { error: "rate_limited" });
  // Accept the key under its proper name, or the misspelt name it was first saved under in Vercel.
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NTHROPIC_API_KEY;
  // "reason" says which of the two causes it is, so an outage can be diagnosed
  // from outside without reading the function logs. It reveals nothing secret.
  if (!apiKey) { console.error("assistant unavailable: no Anthropic API key in the environment"); return json(503, { error: "assistant_unavailable", reason: "no_key" }); }
  let body;
  try { body = await request.json(); } catch { return json(400, { error: "bad_json" }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(400, { error: "bad_json" });
  // Health check: { ping: true } asks whether the model can be reached with
  // the configured key, without spending anything. The widget calls it before
  // it asks a visitor to type or a tenant to verify, so nobody does that work
  // only to be told the assistant is down.
  if (body.ping === true) {
    try {
      await new Anthropic({ apiKey, maxRetries: 0, timeout: 8_000 }).models.retrieve(MODEL);
      return json(200, { ok: true });
    } catch (e) {
      const rejected = e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError;
      console.error("assistant health check failed", e?.status, rejected ? "key rejected" : e?.message);
      // Only a refused key is a definite "down". Anything else (a slow
      // network, a lookup hiccup) is not proof, so let the conversation try.
      if (rejected) return json(503, { error: "assistant_unavailable", reason: "key_rejected" });
      return json(200, { ok: true, checked: false });
    }
  }
  const mode = MODES.has(body.mode) ? body.mode : "landlord";
  const clean = sanitise(body.messages);
  if (!clean) return json(400, { error: "bad_messages" });

  let tenant = null;
  if (mode === "repair") {
    const s = verify(body.session);
    if (!s || s.t !== "session" || s.expired) return json(401, { error: "session_expired" });
    tenant = { reference: s.ref, name: s.name, address: s.address, email: s.email, phone: s.phone };
  }

  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  const ctx = { tenant, mode, photos: clean.photos, raised: [] };
  const messages = clean.messages;
  const base = {
    model: MODEL,
    max_tokens: 1500,
    system: [{ type: "text", text: systemPrompt({ mode, tenant }), cache_control: { type: "ephemeral" } }],
    tools,
  };

  let reply = "";
  let done = false;
  try {
    for (let turn = 0; turn < 4; turn++) {
      const res = await client.messages.create({ ...base, messages });
      if (res.stop_reason === "refusal") {
        reply = `I cannot help with that here. Ring ${PHONE} or email admin@surelets.co.uk and a person will help.`;
        break;
      }
      const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      const toolUses = res.content.filter((b) => b.type === "tool_use");
      if (!toolUses.length) { reply = text; break; }
      messages.push({ role: "assistant", content: res.content });
      const results = [];
      for (const t of toolUses) {
        let out;
        try { out = await runTool(t.name, t.input, ctx); } catch (e) { console.error("tool failed", t.name, e); out = `The ${t.name} step failed at our end. Apologise and give the phone number and email.`; }
        results.push({ type: "tool_result", tool_use_id: t.id, content: out });
      }
      messages.push({ role: "user", content: results });
      done = ctx.raised.length > 0;
      if (res.stop_reason === "end_turn") { reply = text; break; }
    }
    if (!reply) reply = ctx.raised.length ? `Done. Your reference is ${ctx.raised[0].reference}.` : "Sorry, I lost my thread. Could you say that again?";
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json(429, { error: "rate_limited" });
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) { console.error("assistant unavailable: Anthropic rejected the API key", e.status); return json(503, { error: "assistant_unavailable", reason: "key_rejected" }); }
    if (e instanceof Anthropic.APIError) { console.error("claude api error", e.status, e.message); return json(502, { error: "upstream" }); }
    console.error("chat failed", e);
    return json(500, { error: "server" });
  }
  return json(200, { reply, raised: ctx.raised, done });
}
