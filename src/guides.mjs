// Guides: long-form articles for landlords, written in Markdown in
// src/guides/*.md with a front-matter block. build.mjs turns them into
// /guides/<slug>/, the /guides/ index, a home page strip and an RSS feed.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "./markdown.mjs";
import { site, esc } from "./layout.mjs";

const icon = (name, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="/assets/icons.svg#${name}"/></svg>`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const longDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export function loadGuides(dir) {
  const guides = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const raw = readFileSync(join(dir, file), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) throw new Error(`Missing front matter in guides/${file}`);
    const meta = Object.fromEntries(
      m[1].split("\n").filter(Boolean).map((line) => {
        const i = line.indexOf(":");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
    );
    for (const k of ["title", "description", "category", "date"]) if (!meta[k]) throw new Error(`guides/${file}: missing ${k}`);
    const slug = file.replace(/\.md$/, "");
    const { html, headings, words } = render(m[2]);
    guides.push({
      ...meta,
      slug,
      path: `/guides/${slug}/`,
      html,
      headings,
      words,
      minutes: Math.max(2, Math.round(words / 220)),
      points: meta.points ? meta.points.split("||").map((s) => s.trim()).filter(Boolean) : [],
    });
  }
  return guides.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}

const img = (g, sizes, extra = "") =>
  g.image
    ? `<img src="/assets/img/${g.image}.1400.jpg" srcset="/assets/img/${g.image}.800.jpg 800w, /assets/img/${g.image}.1400.jpg 1400w" sizes="${sizes}" width="1400" height="932" alt="" loading="lazy"${extra}>`
    : "";

export function guideCard(g, { featured = false, delay = 0 } = {}) {
  const H = featured ? "h2" : "h3";
  return `<a class="guide-card${featured ? " guide-featured lit" : ""}" href="${g.path}" data-reveal style="--d:${delay}ms">
  ${featured ? `<div class="guide-featured-img">${img(g, "(max-width: 860px) 100vw, 40vw")}</div>` : ""}
  <div class="guide-card-body">
    <span class="eyebrow">${esc(g.category)}</span>
    <${H}>${esc(g.title)}</${H}>
    <p>${esc(g.description)}</p>
    <span class="guide-meta"><span>${longDate(g.date)}</span><span>${g.minutes} min read</span></span>
  </div>
</a>`;
}

export function guidesIndex(guides) {
  const [first, ...rest] = guides;
  return `<section class="intro">
  <div class="wrap">
    <p class="eyebrow" data-reveal>Guides</p>
    <h1 data-reveal style="--d:60ms">Plain answers for landlords in England.</h1>
    <p class="lede" data-reveal style="--d:120ms">What the rules are, what they cost, and what we would do in your position. Written by the people who manage the properties, updated when the law changes.</p>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="guides-grid">
      ${first ? guideCard(first, { featured: true }) : ""}
      ${rest.map((g, i) => guideCard(g, { delay: (i % 3) * 80 })).join("\n      ")}
    </div>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <div class="cta dark lit" data-reveal>
      <div>
        <h2>Would rather someone else kept up with all this?</h2>
        <p class="lede">That is the job. Send us the address and we will send a written proposal within two working days.</p>
      </div>
      <div class="cta-side">
        <a class="btn btn-primary" href="/contact/">Request a proposal ${icon("arrow-up-right", "btn-ic")}</a>
        <small>Subscribe to new guides: <a href="/guides/feed.xml">RSS feed</a></small>
      </div>
    </div>
  </div>
</section>`;
}

export function guidePage(g, all) {
  const related = all.filter((o) => o.slug !== g.slug).sort((a, b) => (a.category === g.category ? -1 : 0) - (b.category === g.category ? -1 : 0)).slice(0, 3);
  return `<article>
<section class="intro article-head">
  <div class="wrap">
    <p class="crumbs" data-reveal><a href="/guides/">Guides</a> ${icon("caret-down", "crumb-ic")} <span>${esc(g.category)}</span></p>
    <h1 data-reveal style="--d:60ms">${esc(g.title)}</h1>
    <p class="lede" data-reveal style="--d:120ms">${esc(g.description)}</p>
    <p class="article-meta" data-reveal style="--d:160ms"><span>By the Sure Lets &amp; Manage team</span><span>Published ${longDate(g.date)}${g.updated ? `, updated ${longDate(g.updated)}` : ""}</span><span>${g.minutes} min read</span></p>
  </div>
</section>

${g.image ? `<section class="article-figure"><div class="wrap"><div class="frame" data-reveal>${img(g, "(max-width: 860px) 100vw, 82rem", ' style="aspect-ratio: 21 / 9"')}</div></div></section>` : ""}

<section class="section-tight">
  <div class="wrap article">
    <div class="prose article-body">
      ${g.html}
    </div>
    <aside class="article-aside">
      ${g.points.length ? `<div class="keypoints"><h2>Key points</h2><ul>${g.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}
      ${g.headings.length ? `<nav class="toc" aria-label="In this guide"><h2>In this guide</h2><ol>${g.headings.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join("")}</ol></nav>` : ""}
      <div class="aside-cta">
        <p>Want this handled for you?</p>
        <a class="btn btn-primary btn-sm" href="/contact/">Request a proposal ${icon("arrow-up-right", "btn-ic")}</a>
      </div>
    </aside>
  </div>
</section>

<section class="section-tight">
  <div class="wrap">
    <p class="disclaimer">This guide is general information about the law in England as at ${longDate(g.updated || g.date)}. It is not legal advice and the rules change. Check the position for your own tenancy before acting, or ask us.</p>
    <div class="sh" data-reveal><h2>Read next.</h2></div>
    <div class="guides-grid guides-grid-3">
      ${related.map((r, i) => guideCard(r, { delay: i * 80 })).join("\n      ")}
    </div>
  </div>
</section>
</article>`;
}

export function latestStrip(guides) {
  return `<section class="section-tight">
  <div class="wrap">
    <div class="sh" data-reveal>
      <p class="eyebrow">Guides</p>
      <h2>Plain answers for landlords.</h2>
      <p>The rules, the costs and what we would do in your position. <a class="link" href="/guides/">All guides ${icon("arrow-right")}</a></p>
    </div>
    <div class="guides-grid guides-grid-3">
      ${guides.slice(0, 3).map((g, i) => guideCard(g, { delay: i * 80 })).join("\n      ")}
    </div>
  </div>
</section>`;
}

export function feed(guides) {
  const item = (g) => `  <item>
    <title>${esc(g.title)}</title>
    <link>${site.url}${g.path}</link>
    <guid isPermaLink="true">${site.url}${g.path}</guid>
    <pubDate>${new Date(g.date + "T09:00:00Z").toUTCString()}</pubDate>
    <category>${esc(g.category)}</category>
    <description>${esc(g.description)}</description>
  </item>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${site.name}: guides for landlords</title>
  <link>${site.url}/guides/</link>
  <atom:link href="${site.url}/guides/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Plain answers for landlords in England from ${site.name}.</description>
  <language>en-gb</language>
${guides.map(item).join("\n")}
</channel>
</rss>
`;
}
