# Sure Lets & Manage

Marketing site for Sure Lets and Manage Limited, a residential property management
company. Hand-coded static site, hosted on GitHub Pages at https://surelets.co.uk.

No dependencies. Node 20+ to build.

```bash
node build.mjs    # build to dist/
node audit.mjs    # link, alt text, metadata and copy checks (runs in CI)
node server.mjs   # preview at http://localhost:4322
```

## Layout

| Path | Purpose |
|---|---|
| `src/pages/*.html` | One file per page: a small front-matter block, then the page body |
| `src/layout.mjs` | Site config (name, phone, address, company numbers), head, header, footer, chat shell |
| `assets/css/tokens.css` | Colour, type, spacing and motion tokens, plus the self-hosted fonts |
| `assets/css/main.css` | The design system and every component |
| `assets/js/main.js` | Progressive enhancement: header, menu, reveals, fee calculator, form, guided chat |
| `assets/img/` | Photography, three sizes each |
| `public/brand/` | Logo files (SVG and PNG) and the brand guidelines PDF |
| `.github/workflows/pages.yml` | Builds, audits and deploys on every push to `main` |

## Editing

Change copy in `src/pages/`. Change contact details or company numbers once in
`src/layout.mjs`. Fees appear on the home page, landlords page and fees page;
search for the percentage when changing them.

The contact form and chat hand a pre-filled message to the visitor's email app.
To collect enquiries server-side instead, point the form `action` at a form
service and remove `data-to` in `src/pages/contact.html`.

## Photography credits

Own portfolio photography plus three Creative Commons images credited at `/credits/`.
