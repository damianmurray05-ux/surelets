// Build gate: every internal link and anchor resolves, every image has alt
// text, every page has a title and description, and no em or en dashes leak
// into copy. Exit 1 on any failure so a broken deploy never ships.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const dist = "dist";
const pages = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") && !/\/google[0-9a-f]+\.html$/.test(p) && pages.push(p); // Google's verification file is not a page
  }
})(dist);

let problems = 0;
const fail = (msg) => { problems++; console.error("  x " + msg); };

for (const f of pages) {
  const html = readFileSync(f, "utf8");
  if (!/<title>[^<]{5,}<\/title>/.test(html)) fail(`${f}: missing title`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) fail(`${f}: missing description`);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  if (desc.replace(/&amp;/g, "&").replace(/&#39;|&quot;/g, "'").length > 165) fail(`${f}: description is ${desc.length} characters, search engines cut it at about 160`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(`${f}: needs exactly one h1`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { fail(`${f}: structured data is not valid JSON`); }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) fail(`${f}: img without alt`);
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  if (/[–—]/.test(body)) fail(`${f}: contains an em or en dash`);
  const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
    for (let u of m[1].split(",").map((s) => s.trim().split(" ")[0])) {
      if (!u.startsWith("/") || u.startsWith("//")) continue;
      const [rawPath, hash] = u.split("#");
      const path = rawPath.split("?")[0];
      if (path) {
        const target = path.endsWith("/") ? join(dist, path, "index.html") : join(dist, path);
        if (!existsSync(target)) fail(`${f}: broken link ${u}`);
      } else if (hash && !ids.has(hash)) fail(`${f}: missing anchor #${hash}`);
    }
  }
}

console.log(`${pages.length} pages audited, ${problems} problem${problems === 1 ? "" : "s"}`);
process.exit(problems ? 1 : 0);
