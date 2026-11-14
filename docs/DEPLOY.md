# Going live

The website is static and lives on GitHub Pages at https://surelets.co.uk
(built by `node build.mjs`, pushed to the `gh-pages` branch; see "Publishing
the website" at the end). The assistant
is two small server functions in `api/`, hosted on Vercel from the same
repository. Vercel redeploys on every push to `main`. One-off setup, about
twenty minutes, then nothing to maintain.

## 1. Connect Vercel to the repository

1. Sign in at <https://vercel.com> with the GitHub account `damianmurray05-ux`
   (the same account used for Property Sauce).
2. **Add New > Project**, choose `surelets`, click **Import**. Build settings
   come from `vercel.json`; leave them alone. Name the project `surelets` so
   the address is `surelets.vercel.app`, which the website is already
   pointed at. (Any other name works: change `api` in `src/layout.mjs`.)
3. **Deploy**. The functions are live in about a minute. The assistant on the
   website switches itself on as soon as the keys below are in place.

## 2. Add the keys

In the Vercel project, **Settings > Environment Variables**, add:

| Name | Value | Needed for |
|---|---|---|
| `ANTHROPIC_API_KEY` | From <https://console.anthropic.com> (API Keys). Create one key per site so spend is attributable | The assistant |
| `CHAT_SECRET` | Any long random string, 32 characters or more | Signing verification codes and sessions |
| `TENANT_DIRECTORY_URL` | See step 3 | Verifying tenants |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | From <https://twilio.com>; `TWILIO_FROM` is the sending number in international format | One-time codes by text. Not set up: codes go by email only until these exist |
| `RESEND_API_KEY` | From <https://resend.com> after verifying `surelets.co.uk` there | One-time codes by email, repair reports and enquiries to the team, confirmations to the person |

Optional:

| Name | Value | Needed for |
|---|---|---|
| `TEAM_EMAIL` | Defaults to `admin@surelets.co.uk` | Where reports and enquiries are sent |
| `MAIL_FROM` | Defaults to `Sure Lets & Manage <assistant@surelets.co.uk>` | Sender name on emails |
| `MAINTENANCE_WEBHOOK_URL` | A Zapier or Make webhook | Pushing every job into Trello, a sheet, or Zoho |
| `CHAT_MODEL` | Defaults to `claude-sonnet-5` | Which model answers |
| `CORS_ORIGINS` | Comma-separated extra origins | Only if the site moves domain |

After adding variables, **Deployments > Redeploy** the latest one.

## 3. The tenant directory: Zoho CRM

The assistant verifies a tenant by looking up the rent payment reference they
quote in Zoho CRM, live, and sending a code to the mobile or email on that
tenancy record. Only tenancies whose Status is current (Tenanted, Arrears,
Possession Proceedings, Court, Let Agreed, Maintenance Only) can verify, and
records whose name starts with an X are ignored.

The function needs its own read-only access to the CRM. One-off setup, about
five minutes:

1. Go to <https://api-console.zoho.com> (this Zoho account is on the US data
   centre, so `.com`, not `.eu`), signed in as the CRM admin. Open the existing
   **Self Client** created for the Marchbank portal, or **Add Client > Self
   Client** if there is none.
2. Copy the **Client ID** and **Client Secret** from the Client Secret tab.
3. On the **Generate Code** tab, enter scope
   `ZohoCRM.modules.contacts.READ,ZohoCRM.settings.fields.READ,ZohoBooks.contacts.READ,ZohoBooks.invoices.READ,ZohoBooks.settings.READ`,
   duration 10 minutes, any description, and click **Create**. Copy the code.
4. Within ten minutes, in a terminal on this machine, run
   `node scripts/zoho-token.mjs <client id> <client secret> <code>`.
   It writes `scripts/zoho.env` with the values Vercel needs.
5. In Vercel, **Add Environment Variable**, paste the whole contents of
   `scripts/zoho.env` into the Key box (Vercel splits it into the separate
   variables), save, redeploy, then delete `scripts/zoho.env`.

A Google Sheet published as CSV still works as a fallback
(`TENANT_DIRECTORY_URL`, columns in `docs/tenant-directory-template.csv`), and
is used only when the Zoho keys are absent.

## 4. Sending email

Resend needs the domain verified: in Resend, **Domains > Add domain**,
`surelets.co.uk`, then add the DNS records it shows at GoDaddy (they are TXT
and MX records on a subdomain, so they do not affect your Microsoft 365 mail).

## 5. Testing without keys

Set `CHAT_DEV_ECHO_CODE=1` on a preview deployment and the verification code is
shown in the chat instead of being sent. Never set this on production.

## What each piece costs

Vercel free tier covers this traffic. Anthropic is pay as you go: a typical
conversation costs a few pence. Twilio texts are about 4p each. Resend is free
for the first three thousand emails a month.

## If the assistant says it is not available

Ask it anything on the website. If it answers "The assistant is not available
right now", open <https://surelets.vercel.app/api/chat> in a terminal:

```bash
curl -s -X POST https://surelets.vercel.app/api/chat -H 'content-type: application/json' \
  -d '{"mode":"landlord","messages":[{"role":"user","content":"hello"}]}'
```

`"reason":"no_key"` means the `ANTHROPIC_API_KEY` variable is missing from the
Vercel project (step 2). `"reason":"key_rejected"` means the key is there but
Anthropic refused it: it has been revoked or the account has a problem. Create
a new key, save it in Vercel, and redeploy.

## Publishing the website

Pushing `main` redeploys Vercel (the assistant, and a copy of the site at
surelets.vercel.app). The public site on GitHub Pages is published separately,
from the built `dist/` folder:

```bash
node build.mjs && node audit.mjs && node --test test/*.test.mjs   # all three must pass
git clone --depth 1 --branch gh-pages https://github.com/damianmurray05-ux/surelets.git "$TMPDIR/sl-pages"
rsync -a --delete --exclude .git dist/ "$TMPDIR/sl-pages/"
cd "$TMPDIR/sl-pages" && git add -A && git commit -m "Publish" && git push https://github.com/damianmurray05-ux/surelets.git HEAD:gh-pages
```

Build after committing to `main`, not before: the sitemap takes each page's
"last changed" date from the commit history. Changes appear on surelets.co.uk
within a couple of minutes; GitHub caches pages for ten minutes.
