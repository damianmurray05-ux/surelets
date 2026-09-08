// The assistant. POST { mode, session, messages } -> { reply, raised, done }
// Stateless: the browser keeps the transcript and sends it each turn. The
// verified tenant comes from the signed session, never from the transcript.
import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "../src/chat/prompt.mjs";
import { tools, runTool } from "../src/chat/tools.mjs";
import { verify } from "../src/chat/crypto.mjs";
import { limit } from "../src/chat/ratelimit.mjs";
import { corsHeaders, preflight } from "../src/chat/cors.mjs";

const MODEL = process.env.CHAT_MODEL || "claude-sonnet-5";
const MODES = new Set(["repair", "repair-unverified", "tenancy", "landlord"]);
const PHONE = "+44 (0)20 8158 8434";

function sanitise(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) return null;
  const out = [];
  const photos = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") return null;
    if (typeof m.content === "string") {
      if (m.content.length > 6000) return null;
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (!Array.isArray(m.content)) return null;
    const blocks = [];
    for (const b of m.content) {
      if (b.type === "text" && typeof b.text === "string" && b.text.length <= 6000) blocks.push({ type: "text", text: b.text });
      else if (b.type === "image" && m.role === "user" && b.source?.type === "base64" && /^image\/(jpeg|png|webp)$/.test(b.source.media_type) && typeof b.source.data === "string" && b.source.data.length < 1_500_000) {
        blocks.push({ type: "image", source: { type: "base64", media_type: b.source.media_type, data: b.source.data } });
        if (photos.length < 4) photos.push({ data: b.source.data });
      } else if (b.type === "tool_use" || b.type === "tool_result") blocks.push(b);
      else return null;
    }
    if (!blocks.length) return null;
    out.push({ role: m.role, content: blocks });
  }
  if (out[0].role !== "user") return null;
  return { messages: out, photos };
}

export async function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(request) } });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!limit(`chat:${ip}`, 40, 10 * 60 * 1000)) return json(429, { error: "rate_limited" });
  // Accept the key under its proper name, or the misspelt name it was first saved under in Vercel.
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.NTHROPIC_API_KEY;
  if (!apiKey) return json(503, { error: "assistant_unavailable" });
  let body;
  try { body = await request.json(); } catch { return json(400, { error: "bad_json" }); }
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
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: "assistant_unavailable" });
    if (e instanceof Anthropic.APIError) { console.error("claude api error", e.status, e.message); return json(502, { error: "upstream" }); }
    console.error("chat failed", e);
    return json(500, { error: "server" });
  }
  return json(200, { reply, raised: ctx.raised, done });
}
