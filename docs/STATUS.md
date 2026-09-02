# Gate — build status

Canonical status tracker, living in git so it travels with the code — not a
schedule, an inventory. Items in the same group have no order dependency on
each other, only on the gate named in their heading. Update this in the same
commit as the feature it describes.

_Last updated: 2026-09-02_

## Already built (18)

- **Core AI qualification gate** — conversational screening, QUALIFIED / REDIRECT / REJECTED
- **Gate-setup compiler** — turns an expert's 4 answers into a qualification prompt + sample conversation
- **Booking flow** — holds, access codes, slot picking, confirmation
- **Google Calendar integration** — multi-calendar conflict checking, default event calendar; multiple Google calendars per professional already supported
- **Public branded professional page** — hero, services, testimonials, the gate itself
- **Dashboard** — leads inbox, bookings, calendars, availability, services, access codes, profile, settings
- **Auth** — Google OAuth; dev-email login disabled outside development
- **Token-balance metering** — see `docs/decisions/0002-plan-tier-billing-model.md`
- **Background jobs (manually triggered)** — hold expiry, event-creation retry, calendar sync, token health check, outcome follow-ups, pattern reports, monthly token-balance reset — see `docs/decisions/0004-background-jobs-deferred-inngest.md`
- **Correction / override loop** — professional can mark an AI decision wrong on any lead, captured as structured data
- **Low-friction outcome tracking** — one-click follow-up email + magic-link page, Won/Lost/No response, optional deal value
- **AI Pattern Report** — weekly digest on rejection patterns, objections, and a suggested refinement, metered against the same token balance as the live gate
- **Founder-facing admin overview + legal pages** — platform-wide stats at `/admin`; `/privacy` and `/terms` live and linked from the homepage footer
- **Real calendar conflict-checking + provider abstraction** — see `docs/decisions/0001-calendar-provider-abstraction.md`
- **Anonymous visit stitching** — `gate_visitor_id` cookie logs every hit on a professional's page; visits backfill onto a Lead the moment one exists; leads inbox shows the full path, not just the last referrer
- **Embeddable booking widget** — `public/embed.js` + `/embed/[slug]`, see `docs/decisions/0003-embed-widget-frame-ancestors.md`
- **Pre-call briefing** — AI summary of a lead's qualification transcript, cached on the Lead, surfaced in the Bookings dialog before a call. Built ahead of the interview-validation question per direct instruction — worth confirming it's actually wanted once those interviews happen.
- **Plan tier data model + enforcement** — see `docs/decisions/0002-plan-tier-billing-model.md`. Data model and enforcement only — Stripe billing is not built.

## Buildable now (1)

- **Stripe billing — checkout, subscriptions, webhooks.** The piece that actually moves a professional between tiers and collects money. Blocked on a Stripe account + API keys — can't be built and verified live without them. Policy already decided (see decision 0002): non-payment soft-locks new leads/bookings after Stripe's retry window, existing confirmed bookings are never touched.

## Gated on the lawyer interviews (6)

- **EU / German data hosting** — mandatory once handling regulated-profession data, part of the "right to operate," not a checkbox
- **`PENDING_REVIEW` decision logic** — wire the already-modeled but unused state into the AI, only if "assisted not autonomous" is what validates
- **Conflict-of-interest intake** — a real legal requirement; meetergo already has this, Gate doesn't
- **Register-adaptive AI prompts** — technical language with the expert, plain language with the end user
- **Outlook calendar integration (direct, not via vendor)** — confirmed as the universal baseline alongside Google by Calendly, HubSpot, and meetergo; the abstraction layer already exists, this is now "add an OUTLOOK branch to `calendar-provider.service.ts`," not a from-scratch integration
- **CalDAV calendar integration** — covers Apple and self-hosted/EU-privacy providers (Nextcloud, Open-Xchange); also just a new branch in the same abstraction once built. Validate first: add "what calendar/email system does your firm run on?" to the interviews before building.

## Gated on the directory branch (2)

- **Directory / listing pages** — searchable by profession and city
- **Registry-scrape-and-claim pipeline** — import public bar/medical/tax-advisor registries, build the claim-and-upgrade flow; needs legal review first

## Gated on the referral-network trust question (3)

- **Cross-professional `REDIRECT`** — extend the existing single-professional redirect to route across a vetted network
- **Network verification / credentialing** — infrastructure to vouch for who's actually in the network
- **Split billing model** — subscription/placement where referral fees are banned (lawyers, doctors); revenue-share where legal (trades, unregulated coaches)

## Long horizon (4)

- **Migrate background jobs to Inngest** — see `docs/decisions/0004-background-jobs-deferred-inngest.md`. Not a launch blocker.
- **Accountability / guarantee layer** — verified credentials, liability structure, audit trail
- **Portable professional reputation** — track record as a compounding asset, a real switching cost
- **Agent-to-agent interface** — structured, machine-queryable criteria instead of only a chat window
