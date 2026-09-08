# Going live

The website is static and lives on GitHub Pages at https://surelets.co.uk
(built by `node build.mjs`, pushed to the `gh-pages` branch). The assistant
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
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | From <https://twilio.com>; `TWILIO_FROM` is the sending number in international format | One-time codes by text (recommended default) |
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

## 3. The tenant directory

The assistant verifies a tenant by looking up their tenancy reference and
sending a code to the mobile or email on file. That list lives outside the
code, in a Google Sheet you control:

1. Create a Google Sheet with the columns in
   `docs/tenant-directory-template.csv`: `reference, name, email, phone,
   address, notes`. One row per tenancy. Phone numbers in international
   format (`+447700900000`).
2. **File > Share > Publish to web**, choose the sheet and **Comma-separated
   values (.csv)**, click **Publish**, and copy the link.
3. Paste that link as `TENANT_DIRECTORY_URL` in Vercel. Changes to the sheet
   are picked up within five minutes.

Give every tenant their reference; it is what they are asked for. The format
`SL-1234` is a suggestion; anything unique works.

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
