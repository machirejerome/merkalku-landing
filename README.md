This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## SEO and optional measurement (P0)

Canonical origin: `https://www.merkalku.de`. Add future indexable routes to
`src/lib/seo.ts`/page metadata, `src/app/sitemap.ts`, and the explicit page allowlist
in `src/lib/analytics.ts`. `/ausschreibung` intentionally remains noindex.

Production configuration:

```dotenv
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XB5J8XB893
```

The measurement ID is public, not a credential. The GA4 stream is
`15955106538` in property `518949678` (MerKalku account `379811331`). It was linked
to the Search Console domain property `merkalku.de` on 2026-10-02 under the
operator account. Enhanced Measurement, Google Signals, granular
location/device collection and ads personalization are disabled. Event and user
retention are two months, without resetting on new activity.

Local/preview measurement is disabled unless explicitly opted in **at build time**:

```dotenv
NEXT_PUBLIC_ENABLE_MEASUREMENT_PREVIEW=true
NEXT_PUBLIC_GA_DEBUG_MODE=true
```

Use these two switches only for explicit QA. Do not set them in Production or
general Preview environments. Without a valid measurement ID, consent UI and
service forms still work, but Google Analytics does not load.

`ConsentManager` starts measurement by default for a fresh visit on a measurement host.
Only a small `Datenschutz` tab is shown at the bottom edge. The settings dialog
opens on request, never automatically, and can be closed without making a choice.
Default operation is not stored as an explicit consent record. GA starts with
`analytics_storage: granted` and can set Analytics cookies immediately. Google's
advertising storage, advertising user data and ad personalization remain denied.
Marketing SDKs can run in default mode.
Analytics and marketing have independent settings. A saved rejection, invalid or
expired record, and storage failures disable the relevant measurement. Withdrawal disables Google
measurement, clears optional storage and starts a new document to stop running
third-party SDKs. The consent record is versioned and expires after 180 days.
Form submissions remain service requests; optional database session association
follows the analytics setting, advertising attribution and server-side OpenAI
conversions follow the marketing setting. Default operation is sent separately
as `measurementDefault`, never as a fabricated consent record. This default-on
configuration is an explicit operator decision, not a claim of valid consent or
legal compliance. Existing service/CRM credentials are not
part of the browser configuration.

GA parameters are allowlisted. Contact details, individual calculator answers,
calculated savings, arbitrary query strings and advertising click IDs are not
sent to Google Analytics. `demo_cta_click` and `kalender_geoeffnet` mean interest,
not a confirmed booking. `generate_lead` is not revenue. A verified booking
callback/webhook and deduplication are required before adding a booking key event.

Validation:

```sh
node --test tests/*.test.mjs
npm run build
npm run lint
```

Full ESLint has existing errors in the two setup scripts and two calculator
effects; focused lint must pass for the new measurement code and API routes.
Use Node 22.13 or newer within the 22.x line for the ESLint dependency engine.
Offline tests mock CRM, database and advertising requests: they never create
real leads. For browser QA, verify a fresh visit shows no dialog and starts default
measurement on an enabled host without saving an explicit consent record. Manual
opening must show the current settings; closing with the button or Escape must not
save a choice. Check the bottom-edge tab does not overlap mobile CTAs. Verify no
optional requests after saved rejection/reload or withdrawal; one page_view per actual route; separate
CTA and booking semantics; successful collection in GA DebugView.

Release: review the branch, resolve the hosting plan (the current Vercel Hobby
team is restricted to personal/noncommercial use), then deploy the reviewed
revision and repeat the consent checks on www.merkalku.de. Do not roll back to
the prior unconditional tracking scripts if a regression occurs: disable the
affected optional integration or deploy a consent-preserving fix. The submitted
sitemap currently has a GSC fetch/read error despite public HTTP 200/XML; verify
successful processing after release before claiming indexation is fixed.
