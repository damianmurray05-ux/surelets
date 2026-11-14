// Shared page shell for Sure Lets & Manage.

export const site = {
  name: "Sure Lets & Manage",
  legalName: "Sure Lets and Manage Limited",
  domain: "surelets.co.uk",
  url: "https://surelets.co.uk",
  // Where the assistant's functions run (Vercel). Empty string means same origin.
  api: "https://surelets.vercel.app",
  phone: "+44 (0)20 8158 8434",
  phoneHref: "tel:+442081588434",
  email: "admin@surelets.co.uk",
  address: "Top Floor, 55 Coopers Lane, Leyton, London E10 5DG",
  registeredOffice: "Lancaster House, Brownrigg Drive, Cramlington NE23 6UN",
  companyNumber: "16613860",
  prs: "PRS058008",
  ico: "ZC027659",
  description:
    "Residential property management across England. Fully managed lettings, rent collection and compliance, handled by a team that owns and lets property itself.",
};

const nav = [
  ["/landlords/", "Landlords"],
  ["/fees/", "Fees"],
  ["/tenants/", "Tenants"],
  ["/about/", "About"],
  ["/guides/", "Guides"],
  ["/contact/", "Contact"],
];

const icon = (name, cls = "") =>
  `<svg class="ic ${cls}" width="20" height="20" aria-hidden="true"><use href="/assets/icons.svg#${name}"/></svg>`;

// The SL mark, inline. The letters are set in the page's own Bricolage
// Grotesque, so no extra request; colours are switched by CSS on dark grounds.
const mark = () =>
  `<svg class="brand-mark" viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><rect width="64" height="64" rx="15"/><text x="12" y="45" font-family="Bricolage Grotesque, Helvetica Neue, Arial, sans-serif" font-weight="700" font-size="37" letter-spacing="-2.5">S<tspan>L</tspan></text></svg>`;

export function layout(meta, body) {
  const title = meta.title ? `${meta.title} | ${site.name}` : `${site.name} | Property management across England`;
  const desc = meta.description || site.description;
  const canonical = `${site.url}${meta.path}`;
  const dark = meta.header === "dark";
  const ogImage = meta.image ? `${site.url}/assets/img/${meta.image}.1400.jpg` : `${site.url}/assets/img/regents-park-terrace.1400.jpg`;
  const ogAlt = meta.image ? "A property managed by Sure Lets & Manage" : "A stucco terrace of tall London town houses";
  const is404 = meta.slug === "404";
  // Guide pages sit under Guides in the menu.
  const current = (href) => meta.path === href || (href !== "/" && href === "/guides/" && String(meta.path).startsWith(href));
  // JSON inside a script element: "<" is escaped so no value can close the tag.
  const ld = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${site.url}/#organisation`,
    name: site.name,
    legalName: site.legalName,
    description: site.description,
    url: site.url,
    telephone: "+442081588434",
    email: site.email,
    image: ogImage,
    logo: `${site.url}/brand/mark-1024.png`,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Top Floor, 55 Coopers Lane",
      addressLocality: "London",
      postalCode: "E10 5DG",
      addressCountry: "GB",
    },
    areaServed: { "@type": "Country", name: "England" },
    memberOf: { "@type": "Organization", name: "Property Redress Scheme" },
  };

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<script>document.documentElement.className="js";setTimeout(function(){if(!window.__slReveal)document.documentElement.className+=" reveal-all"},2500)</script>
${is404 ? "" : `<link rel="canonical" href="${canonical}">`}
${meta.noindex === "true" ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="${meta.article ? "article" : "website"}">
<meta property="og:locale" content="en_GB">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${is404 ? "" : `<meta property="og:url" content="${canonical}">`}
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="${esc(ogAlt)}">
${meta.article ? `<meta property="article:published_time" content="${meta.date}">\n<meta property="article:modified_time" content="${meta.updated || meta.date}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#0f1a2b">
<meta name="sl-api" content="${site.api}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}: guides for landlords" href="/guides/feed.xml">
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/main.css">
<script type="application/ld+json">${ld(jsonLd)}</script>
${meta.article ? `<script type="application/ld+json">${ld(articleLd(meta, canonical, ogImage))}</script>` : ""}
</head>
<body class="${dark ? "header-dark" : ""}" data-page="${meta.slug}">
<a class="skip" href="#main">Skip to content</a>

<header class="site-header" id="top">
  <div class="header-inner">
    <a class="brand" href="/" aria-label="${site.name} home">
      ${mark()}
      <span class="brand-word">Sure Lets <span class="amp">&amp;</span> Manage</span>
    </a>
    <nav class="nav" aria-label="Primary">
      ${nav
        .map(([href, label]) => `<a href="${href}"${current(href) ? ` aria-current="${meta.path === href ? "page" : "true"}"` : ""}>${label}</a>`)
        .join("\n      ")}
    </nav>
    <a class="btn btn-primary btn-sm header-cta" href="/contact/">Request a proposal ${icon("arrow-up-right", "btn-ic")}</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">
      <span></span><span></span>
    </button>
  </div>
  <div class="mobile-nav" id="mobile-nav" hidden>
    <nav aria-label="Mobile">
      ${nav.map(([href, label], i) => `<a href="${href}" style="--i:${i}"${current(href) ? ` aria-current="${meta.path === href ? "page" : "true"}"` : ""}>${label}</a>`).join("\n      ")}
      <a href="/contact/" class="btn btn-primary" style="--i:${nav.length}">Request a proposal ${icon("arrow-up-right", "btn-ic")}</a>
    </nav>
    <p class="mobile-nav-foot"><a href="${site.phoneHref}">${site.phone}</a><br><a href="mailto:${site.email}">${site.email}</a></p>
  </div>
</header>

<main id="main">
${body}
</main>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <a class="brand" href="/">${mark()}<span class="brand-word">Sure Lets <span class="amp">&amp;</span> Manage</span></a>
      <p class="footer-tag">Residential property management for landlords who expect their agent to be as careful with a property as they are.</p>
      <p class="footer-contact">
        <a href="${site.phoneHref}">${site.phone}</a><br>
        <a href="mailto:${site.email}">${site.email}</a><br>
        ${site.address}
      </p>
    </div>
    <div class="footer-col">
      <h2>Services</h2>
      <a href="/landlords/">Fully managed</a>
      <a href="/landlords/#rent-collection">Rent collection</a>
      <a href="/landlords/#let-only">Let only</a>
      <a href="/landlords/#portfolio">Portfolio &amp; HMO</a>
      <a href="/fees/">Fees</a>
    </div>
    <div class="footer-col">
      <h2>Company</h2>
      <a href="/about/">About</a>
      <a href="/tenants/">Tenants</a>
      <a href="/renters-rights-act/">Renters' Rights Act</a>
      <a href="/guides/">Guides</a>
      <a href="/contact/">Contact</a>
      <a href="/complaints/">Complaints</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
    </div>
    <div class="footer-col footer-accred">
      <h2>Accreditation</h2>
      <p>Property Redress Scheme member ${site.prs}</p>
      <p>ICO registered ${site.ico}</p>
      <p>Professional indemnity insured</p>
    </div>
  </div>
  <div class="footer-legal">
    <p>${site.legalName}, registered in England and Wales, company number ${site.companyNumber}. Registered office: ${site.registeredOffice}. Luxe Stay and Property Sauce are trading names of ${site.legalName}.</p>
    <p>&copy; ${new Date().getFullYear()} ${site.name}. <a href="/credits/">Photography credits</a>.</p>
  </div>
</footer>

<div class="chat" id="chat" hidden role="dialog" aria-label="Sure Lets and Manage assistant">
  <div class="chat-head">
    <div>
      <strong>Sure Lets &amp; Manage assistant</strong>
      <span id="chat-status">Landlords, tenants and repairs</span>
    </div>
    <button type="button" class="chat-close" aria-label="Close assistant">${icon("x")}</button>
  </div>
  <div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-label="Conversation" tabindex="0"></div>
  <div class="chat-actions" id="chat-actions"></div>
</div>
<button type="button" class="chat-launch" id="chat-launch" aria-controls="chat" aria-expanded="false">
  ${icon("chat-circle-dots")} <span>Ask a question</span>
</button>

<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/assistant.js" defer></script>
</body>
</html>
`;
}

function articleLd(meta, canonical, image) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: meta.title,
      description: meta.description,
      image,
      datePublished: meta.date,
      dateModified: meta.updated || meta.date,
      author: { "@type": "Organization", "@id": `${site.url}/#organisation`, name: site.name, url: site.url },
      publisher: { "@type": "Organization", "@id": `${site.url}/#organisation`, name: site.name, url: site.url, logo: { "@type": "ImageObject", url: `${site.url}/brand/mark-1024.png`, width: 1024, height: 1024 } },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      articleSection: meta.category,
      inLanguage: "en-GB",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site.url + "/" },
        { "@type": "ListItem", position: 2, name: "Guides", item: site.url + "/guides/" },
        { "@type": "ListItem", position: 3, name: meta.title, item: canonical },
      ],
    },
  ];
}

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
