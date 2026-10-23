# Ledobiz website

Marketing site and admin dashboard for Ledobiz Technologies, built with Next.js 16 (App Router), React 19,
Tailwind CSS 4, Prisma 7 on PostgreSQL (Neon), OpenAI and Nodemailer.

## Set up

1. `cp .env.example .env.local` and fill in `DATABASE_URL` (Neon pooled connection string),
   `ADMIN_EMAIL` and `ADMIN_PASSWORD`. `OPENAI_API_KEY` and `BREVO_API_KEY` are optional: without them you
   write emails by hand and they are saved to the history without being sent.
2. Create the tables and the first admin:

```bash
npm install
npm run db:deploy   # applies prisma/migrations
npm run db:seed     # admin from ADMIN_EMAIL/ADMIN_PASSWORD; add SEED_DEMO=1 for demo data
```

3. Sign in at `/zeus/login`.

## Run it

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
npm run lint
```

## Pages

| Route | File |
| --- | --- |
| `/` | `src/app/page.tsx` |
| `/services/[slug]` (6 services) | `src/app/services/[slug]/page.tsx`, content in `src/lib/services.ts` |
| `/terms`, `/privacy` | `src/app/terms`, `src/app/privacy`, content in `src/lib/legal.ts` |
| 404 | `src/app/not-found.tsx` |
| 500 | `src/app/error.tsx`, `src/app/global-error.tsx` |
| Quote API (saves to the database, emails the visitor and the team) | `src/app/api/quote/route.ts` |

## Admin dashboard (`/zeus`)

| Area | What it does |
| --- | --- |
| Overview | New quotes, deadlines at risk, milestones due, revenue and profit |
| Quote requests | Website submissions; AI-drafted replies; mark won to start a project |
| Projects | Ongoing, pending and completed; milestones, planned vs forecast timeline, expenses, invoices, profit; AI deadline/extension emails |
| Clients | Active, prospect and past clients; full email history; AI-drafted emails; log replies you received |
| Finances | Revenue vs expenses, outstanding and overdue invoices, profit by project; new invoices, printable A4 invoices, payments and receipts |
| Client payment page (`/pay/…`) | Linked from every invoice email. The client pays with Paystack or Flutterwave (card, transfer, USSD, mobile money) or tells us they sent a bank transfer; paid invoices get a receipt email and a printable receipt |
| Settings | Company details, team and roles, email sender and signature, AI brand voice, quote form, VAT, currency rates, bank details |

Roles: **Admin** (everything), **Project lead** (quotes, projects, clients), **Finance** (clients, finances),
**Member** (their own projects). Code lives in `src/app/admin`, `src/components/admin`, `src/lib/admin` and
`src/lib/server`. The database schema is `prisma/schema.prisma`; after changing it run `npm run db:migrate`.

## Before going live

- **Payments.** Set `APP_URL`, `PAYSTACK_SECRET_KEY` and/or `FLUTTERWAVE_SECRET_KEY` (+ `FLUTTERWAVE_WEBHOOK_HASH`),
  and add the webhook URLs from `.env.example` in each provider's dashboard. Use test keys first. Payments are
  always re-verified with the provider before an invoice is marked paid.
- **Automatic emails.** Set `CRON_SECRET`. On Vercel, `vercel.json` runs `/api/cron/daily` at 07:00 UTC
  (08:00 Lagos). Elsewhere, call that URL once a day with `Authorization: Bearer <CRON_SECRET>`. Choose which
  emails go out under Settings → Automatic emails, where "Run now" also triggers it by hand.
- **Email.** Emails go through Brevo: set `BREVO_API_KEY`. The two senders (Settings → Emails and AI;
  hello@ for client emails, accounts@ for billing) must be verified senders in Brevo, and the domain should be
  authenticated there (DKIM/DMARC) so emails don't land in spam. Use "Send test emails" in Settings to check both.
  `SMTP_*` still works as an alternative when `BREVO_API_KEY` is empty.
- **Bot protection.** Create a Cloudflare Turnstile widget (Managed mode, hostname `ledobiz.com`) and set
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Without them the quote form skips the check.
- **Push alerts.** New quote requests send a web push to every active admin, alongside the team email.
  Create a OneSignal app (Web → Custom Code, site URL = `APP_URL`) and set `ONESIGNAL_APP_ID` and
  `ONESIGNAL_REST_API_KEY`. Each admin then opens Settings → Push alerts on each device (Chrome on Android
  works without installing anything) and taps "Turn on alerts on this device", then "Send test alert".
  `public/OneSignalSDKWorker.js` must stay at the site root. Push doesn't work on `localhost` with the live app.
- **Google.** Add the site to Google Search Console (set `GOOGLE_SITE_VERIFICATION`, redeploy, then verify) and
  submit `https://ledobiz.com/sitemap.xml`. Create a Google Business Profile for the Lagos office with the same
  name, email and website. Check structured data with the Rich Results Test after changing `src/components/json-ld.tsx`.
- **Project links.** Set each live site URL in `src/lib/work.ts`.
- **Legal text.** Fill in the `[BRACKETED]` placeholders in `src/lib/legal.ts` and have a lawyer review it.
- **Fonts.** Petrov Sans and Google Sans are subset to Latin and served as WOFF2 from `src/app/fonts/`.
  Confirm the Petrov Sans licence covers web use.

## Design tokens

Brand colours, fonts and the navigation breakpoint live in the `@theme` block of `src/app/globals.css`
(`midnight`, `river`, `salsify`, `gold`, and UI colours such as `surface`, `line`, `muted`, `link`).
