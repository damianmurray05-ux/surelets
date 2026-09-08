// Sure Lets & Manage static site build.
// Zero dependencies. `node build.mjs` writes the finished site to dist/.
// Pages live in src/pages/*.html as body fragments with a small front-matter
// block; src/layout.mjs wraps them with the shared head, header and footer.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { layout, site } from "./src/layout.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, "assets"), join(dist, "assets"), { recursive: true });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), dist, { recursive: true });

const pagesDir = join(root, "src", "pages");
const urls = [];

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith(".html"))) {
  const raw = readFileSync(join(pagesDir, file), "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`Missing front matter in ${file}`);
  const meta = Object.fromEntries(
    m[1].split("\n").filter(Boolean).map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
  );
  const slug = file.replace(/\.html$/, "");
  const path = slug === "index" ? "/" : `/${slug}/`;
  const html = layout({ ...meta, path, slug }, m[2]);
  if (slug === "404") {
    // GitHub Pages serves a root-level 404.html for missing paths.
    writeFileSync(join(dist, "404.html"), html);
    continue;
  }
  const outDir = slug === "index" ? dist : join(dist, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  if (meta.noindex !== "true") urls.push(path);
}

// sitemap + robots
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${site.url}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`
);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
writeFileSync(join(dist, "CNAME"), `${site.domain}\n`);
writeFileSync(join(dist, ".nojekyll"), "");

console.log(`Built ${urls.length} pages -> dist/`);
