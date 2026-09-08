// Best-effort in-memory rate limiting. Serverless instances do not share
// memory, so this bounds abuse per warm instance rather than globally; the
// hard caps in the chat handler (message count, size) do the rest.
const buckets = new Map();
export function limit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++;
  buckets.set(key, b);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.n <= max;
}
