# Sure Lets & Manage

Marketing site for Sure Lets and Manage Limited, a residential property management
company. Hand-coded static site, hosted on GitHub Pages at https://surelets.co.uk.

No dependencies. Node 20+ to build.

```bash
node build.mjs                 # build to dist/
node audit.mjs                 # links, alt text, metadata, headings, structured data and copy checks
node --test test/*.test.mjs    # the assistant's server code, and the legal copy staying consistent
node server.mjs                # preview at http://localhost:4322
```

All three checks must pass before a deploy. Deploy steps are in `docs/DEPLOY.md`.

## Layout

| Path | Purpose |
|---|---|
| `src/pages/*.html` | One file per page: a small front-matter block, then the page body |
| `src/layout.mjs` | Site config (name, phone, address, company numbers), head, header, footer, chat shell |
| `assets/css/tokens.css` | Colour, type, spacing and motion tokens, plus the self-hosted fonts |
| `assets/css/main.css` | The design system and every component |
| `assets/js/main.js` | Progressive enhancement: header, menu, reveals, fee calculator, contact form |
| `assets/js/assistant.js` | The assistant widget: landlord questions, tenant verification, repair reports |
| `api/`, `src/chat/` | The assistant's two server functions (Vercel) and their logic |
| `src/guides/*.md` | Guides, in Markdown. Set `updated:` in the front matter when one is re-checked |
| `test/` | Tests for the assistant, plus checks that the guides, the Renters' Rights Act page and the assistant agree |
| `assets/img/` | Photography, three sizes each |
| `public/brand/` | Logo files (SVG and PNG) and the brand guidelines PDF |
| `ci/pages.yml.txt` | A parked GitHub Actions workflow. Deploys are currently done by hand, see `docs/DEPLOY.md` |

## Editing

Change copy in `src/pages/`. Change contact details or company numbers once in
`src/layout.mjs`. Fees appear on the home page, landlords page and fees page;
search for the percentage when changing them.

The contact form hands a pre-filled message to the visitor's email app. To
collect enquiries server-side instead, point the form `action` at a form
service and remove `data-to` in `src/pages/contact.html`.

## Keeping the legal copy true

The guides, `src/pages/renters-rights-act.html`, the tenants page and
`src/chat/knowledge.mjs` all state English housing law and must agree. When
the law or a date changes, change it in all of them, set `updated:` on the
guides you re-checked against gov.uk, and run the tests: `test/content.test.mjs`
fails if the form names, the rent repayment order period or the landlord
register dates drift apart. Never put a real tenant's name, phone number or
rent payment reference in this repository; it is public.

## Photography credits

Own portfolio photography plus three Creative Commons images credited at `/credits/`.
