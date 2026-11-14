// Sure Lets & Manage static site build.
// Zero dependencies. `node build.mjs` writes the finished site to dist/.
// Pages live in src/pages/*.html as body fragments with a small front-matter
// block; src/layout.mjs wraps them with the shared head, header and footer.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { layout, site } from "./src/layout.mjs";
import { loadGuides, guidesIndex, guidePage, latestStrip, feed } from "./src/guides.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
// Hidden files (.DS_Store, editor and tool caches) are never published.
const visible = (src) => !/(^|[\\/])\.[^\\/]+$/.test(src);
cpSync(join(root, "assets"), join(dist, "assets"), { recursive: true, filter: visible });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), dist, { recursive: true, filter: visible });

const pagesDir = join(root, "src", "pages");
const urls = [];
const guides = loadGuides(join(root, "src", "guides"));

// Cache busting. The stylesheets, scripts and icon sprite keep their names,
// so each reference carries a short hash of the file's contents. A changed
// file gets a new address and browsers fetch it; an unchanged one stays
// cached. (Vercel serves /assets/ as immutable for a year, so without this
// returning visitors there would keep old styles.)
const VERSIONED = ["assets/css/tokens.css", "assets/css/main.css", "assets/js/main.js", "assets/js/assistant.js", "assets/icons.svg"];
const versions = Object.fromEntries(
  VERSIONED.map((f) => [`/${f}`, createHash("sha256").update(readFileSync(join(root, f))).digest("hex").slice(0, 10)])
);
const versioned = (html) =>
  html.replace(/(href|src)="(\/assets\/(?:css\/tokens\.css|css\/main\.css|js\/main\.js|js\/assistant\.js|icons\.svg))(#[^"]*)?"/g, (_, attr, path, hash = "") => `${attr}="${path}?v=${versions[path]}${hash}"`);
const write = (file, html) => writeFileSync(file, versioned(html));

// When a page last changed, for the sitemap: the date of the last commit
// that touched its source. Left out where git history is not available.
const lastChanged = (file) => {
  try {
    const d = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
  } catch { return ""; }
};

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
  const html = layout({ ...meta, path, slug }, m[2].replace("<!-- guides:latest -->", latestStrip(guides)));
  if (slug === "404") {
    // GitHub Pages serves a root-level 404.html for missing paths.
    write(join(dist, "404.html"), html);
    continue;
  }
  const outDir = slug === "index" ? dist : join(dist, slug);
  mkdirSync(outDir, { recursive: true });
  write(join(outDir, "index.html"), html);
  // The home page shows the latest guides, so it changes when they do.
  const changed = [lastChanged(join("src", "pages", file)), ...(slug === "index" ? guides.map((g) => g.updated || g.date) : [])].filter(Boolean).sort().pop() || "";
  if (meta.noindex !== "true") urls.push({ path, lastmod: changed });
}

// Guides: index, one page per article, RSS feed.
mkdirSync(join(dist, "guides"), { recursive: true });
write(
  join(dist, "guides", "index.html"),
  layout({ title: "Guides for landlords in England", description: "Plain-English guides for landlords in England on fees, compliance, possession, arrears and the Renters' Rights Act, written by Sure Lets & Manage.", path: "/guides/", slug: "guides" }, guidesIndex(guides))
);
urls.push({ path: "/guides/", lastmod: guides.map((g) => g.updated || g.date).sort().pop() || "" });
for (const g of guides) {
  mkdirSync(join(dist, "guides", g.slug), { recursive: true });
  write(join(dist, "guides", g.slug, "index.html"), layout({ ...g, slug: `guide-${g.slug}`, article: true }, guidePage(g, guides)));
  urls.push({ path: g.path, lastmod: g.updated || g.date });
}
writeFileSync(join(dist, "guides", "feed.xml"), feed(guides));

// sitemap + robots
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${site.url}${u.path}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n") +
    `\n</urlset>\n`
);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
writeFileSync(join(dist, "CNAME"), `${site.domain}\n`);
writeFileSync(join(dist, ".nojekyll"), "");

console.log(`Built ${urls.length} pages (${guides.length} guides) -> dist/`);
