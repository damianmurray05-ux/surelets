// Validates the transcript the browser sends. The browser only ever holds
// plain text and photos: tool calls happen inside one request on the server
// and are never sent back, so tool blocks from a client are refused rather
// than passed through (they would let a caller script fake tool results).
export const MAX_MESSAGES = 60;
export const MAX_TEXT = 6000;
export const MAX_PHOTOS = 4;
const IMAGE_TYPES = /^image\/(jpeg|png|webp)$/;

export function sanitise(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  const out = [];
  const photos = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content === "string") {
      if (!m.content.trim() || m.content.length > MAX_TEXT) return null;
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (!Array.isArray(m.content)) return null;
    const blocks = [];
    for (const b of m.content) {
      if (!b || typeof b !== "object") return null;
      if (b.type === "text" && typeof b.text === "string" && b.text.trim() && b.text.length <= MAX_TEXT) blocks.push({ type: "text", text: b.text });
      else if (b.type === "image" && m.role === "user" && b.source?.type === "base64" && IMAGE_TYPES.test(b.source.media_type) && typeof b.source.data === "string" && b.source.data.length < 1_500_000 && /^[A-Za-z0-9+/=]+$/.test(b.source.data.slice(0, 2000))) {
        // Only the first few photos are kept; later ones are dropped so a long
        // conversation cannot grow the request without limit.
        if (photos.length >= MAX_PHOTOS) continue;
        blocks.push({ type: "image", source: { type: "base64", media_type: b.source.media_type, data: b.source.data } });
        photos.push({ data: b.source.data, media_type: b.source.media_type });
      } else return null;
    }
    if (!blocks.length) return null;
    out.push({ role: m.role, content: blocks });
  }
  if (out[0].role !== "user" || out[out.length - 1].role !== "user") return null;
  return { messages: out, photos };
}
