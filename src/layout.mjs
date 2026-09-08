// Shared page shell for Sure Lets & Manage.

export const site = {
  name: "Sure Lets & Manage",
  legalName: "Sure Lets and Manage Limited",
  domain: "surelets.co.uk",
  url: "https://surelets.co.uk",
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
  ["/contact/", "Contact"],
];

const icon = (name, cls = "") =>
  `<svg class="ic ${cls}" width="20" height="20" aria-hidden="true"><use href="/assets/icons.svg#${name}"/></svg>`;

// The SL mark, inline so it needs no request and inherits nothing.
const mark = (tile = "#0f1a2b", ink = "#f7f8f6") =>
  `<svg class="brand-mark" viewBox="0 0 64 64" width="34" height="34" aria-hidden="true"><rect width="64" height="64" rx="15" fill="${tile}"/><path d="M30 21.5C28.8 18.2 25.6 16.5 22.2 16.5C17.6 16.5 14.5 19.2 14.5 22.8C14.5 26.6 17.7 28.2 22.4 29.2C27.6 30.3 31 32 31 36.4C31 40.4 27.4 43.5 22.4 43.5C18.4 43.5 15 41.5 13.7 38.2" fill="none" stroke="${ink}" stroke-width="5.2" stroke-linecap="round"/><path d="M39.5 16.5V41" fill="none" stroke="${ink}" stroke-width="5.2" stroke-linecap="round"/><path d="M39.5 41H51" fill="none" stroke="#5b7cff" stroke-width="5.2" stroke-linecap="round"/></svg>`;

export function layout(meta, body) {
  const title = meta.title ? `${meta.title} | ${site.name}` : `${site.name} | Property management across England`;
  const desc = meta.description || site.description;
  const canonical = `${site.url}${meta.path}`;
  const dark = meta.header === "dark";
  const ogImage = `${site.url}/assets/img/regents-park-terrace.1400.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    telephone: "+442081588434",
    email: site.email,
    image: ogImage,
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
<link rel="canonical" href="${canonical}">
${meta.noindex === "true" ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f1a2b">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/main.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
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
        .map(([href, label]) => `<a href="${href}"${meta.path === href ? ' aria-current="page"' : ""}>${label}</a>`)
        .join("\n      ")}
    </nav>
    <a class="btn btn-primary btn-sm header-cta" href="/contact/">Request a proposal ${icon("arrow-up-right", "btn-ic")}</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">
      <span></span><span></span>
    </button>
  </div>
  <div class="mobile-nav" id="mobile-nav" hidden>
    <nav aria-label="Mobile">
      ${nav.map(([href, label], i) => `<a href="${href}" style="--i:${i}">${label}</a>`).join("\n      ")}
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

<div class="chat" id="chat" hidden>
  <div class="chat-head">
    <div>
      <strong>Sure Lets &amp; Manage</strong>
      <span>Usually replies the same working day</span>
    </div>
    <button type="button" class="chat-close" aria-label="Close chat">${icon("x")}</button>
  </div>
  <div class="chat-log" id="chat-log" aria-live="polite"></div>
  <div class="chat-actions" id="chat-actions"></div>
</div>
<button type="button" class="chat-launch" id="chat-launch" aria-controls="chat" aria-expanded="false">
  ${icon("chat-circle-dots")} <span>Ask a question</span>
</button>

<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
}

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
