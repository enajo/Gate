# Gate — build status

Canonical status tracker, living in git so it travels with the code — not a
schedule, an inventory. Items in the same group have no order dependency on
each other, only on the gate named in their heading. Update this in the same
commit as the feature it describes.

_Last updated: 2026-10-09_

## Already built (22)

- **Core AI qualification gate** — conversational screening, QUALIFIED / REDIRECT / REJECTED
- **Gate-setup compiler** — turns an expert's 4 answers into a qualification prompt + sample conversation
- **Booking flow** — holds, access codes, slot picking, confirmation
- **Google Calendar integration** — multi-calendar conflict checking, default event calendar; multiple Google calendars per professional already supported
- **Signed, browser-bound OAuth `state`** (`lib/oauth-state.ts`, shared by Google and Outlook connect) — HMAC-signed, 10-minute expiry, nonce matched against an httpOnly cookie scoped to the provider's callback route, and the callback must finish as the same professional who started it. Blocks account-linking CSRF (an attacker's calendar silently attached to a victim's account, receiving their bookings) and the `returnTo` open redirect; `returnTo` is limited to same-origin paths
- **Public branded professional page** — hero, services, testimonials, the gate itself
- **Dashboard** — leads inbox, bookings, calendars, availability, services, access codes, profile, settings
- **Auth** — Google OAuth; dev-email login disabled outside development
- **Token-balance metering** — see `docs/decisions/0002-plan-tier-billing-model.md`
- **Background jobs (manually triggered)** — hold expiry, event-creation retry, calendar sync, token health check, outcome follow-ups, booking reminders, pattern reports, monthly token-balance reset — see `docs/decisions/0004-background-jobs-deferred-inngest.md`
- **Pre-appointment reminder emails** — `send-booking-reminders.job.ts`, sent once per booking ~24h before the slot (`BOOKING_REMINDER_HOURS_BEFORE`), loss-framed copy ("this time is reserved for you"). Gate had zero no-show mitigation before this — the single best-evidenced, cheapest lever for reducing no-shows per real RCT/meta-analysis research, not a speculative mechanism
- **Correction / override loop, feeding the live gate** — professional can confirm or correct the AI's decision on any lead (`Lead.correctedResult`/`correctionNote`); a service's most recent reviewed leads are now also surfaced back into the qualification prompt itself as calibration examples (`aiConversationService.buildLabeledExamples`, active once a service has 3+ reviewed leads) — real feedback, not just captured data
- **Low-friction outcome tracking** — one-click follow-up email + magic-link page, Won/Lost/No response, optional deal value
- **AI Pattern Report** — weekly digest on rejection patterns, objections, and a suggested refinement, metered against the same token balance as the live gate. Also includes a **channel-quality breakdown** (`pattern-report.service.ts`'s `buildChannelBreakdown`) — which referrer/UTM channel sends leads that actually get QUALIFIED (corrections take precedence over the AI's original call), not just which sends the most traffic. Fully deterministic, no AI call, no token cost — computed and included even if OPENAI_API_KEY is unset or the AI narrative half fails
- **Founder-facing admin overview + legal pages** — platform-wide stats at `/admin`; `/privacy` and `/terms` live and linked from the homepage footer
- **Real calendar conflict-checking + provider abstraction** — see `docs/decisions/0001-calendar-provider-abstraction.md`
- **Anonymous visit stitching** — `gate_visitor_id` cookie logs every hit on a professional's page; visits backfill onto a Lead the moment one exists; leads inbox shows the full path, not just the last referrer
- **Embeddable booking widget** — `public/embed.js` + `/embed/[slug]`, see `docs/decisions/0003-embed-widget-frame-ancestors.md`
- **Pre-call briefing** — AI summary of a lead's qualification transcript, cached on the Lead, surfaced in the Bookings dialog before a call. Built ahead of the interview-validation question per direct instruction — worth confirming it's actually wanted once those interviews happen.
- **Plan tier data model + enforcement** — see `docs/decisions/0002-plan-tier-billing-model.md`. Data model and enforcement only — Stripe billing is not built.
- **Dynamic slot priority** — the AI's QUALIFIED call now also carries `isStrongFit` (stored on `Lead`, only ever set by a real AI judgment, never a fail-open path). A professional can mark availability rules `priorityOnly` (held back for strong-fit leads) and set a narrower `Service.standardAvailabilityExposure` window for everyone else. Strong-fit status is re-derived server-side from the `leadId` in both `/api/public/slots` and the hold/confirm slot check in `booking.service.ts` — never trusted from the client. The narrower standard window is applied client-side only (a perk, not a security boundary); priority-only slots are excluded server-side.
- **AI disclosure + value-first fit signal** — visitors are told up front they're chatting with Gate's AI screening assistant (identity form line + the AI's first turn), and the AI confirms honestly if asked. On a clearly strong answer it may affirm the fit mid-conversation instead of staying neutral until the final decision.
- **Outlook calendar integration (code)** — `outlook-auth.service.ts`, `outlook-calendar.service.ts`, `outlook-sync.service.ts`, the `OUTLOOK` branch in `calendar-provider.service.ts`, `/api/app/outlook/{connect,callback}` routes, `OutlookConnectButton` on both calendar UI surfaces. Not usable until the credentials below exist.

## Buildable now (5)

- **Stripe billing — checkout, subscriptions, webhooks.** The piece that actually moves a professional between tiers and collects money. Blocked on a Stripe account + API keys — can't be built and verified live without them. Policy already decided (see decision 0002): non-payment soft-locks new leads/bookings after Stripe's retry window, existing confirmed bookings are never touched.
- **Outlook credentials** — code is built (see above); blocked purely on a real Azure AD (Microsoft Entra ID) app registration + `MICROSOFT_CLIENT_ID`/`SECRET`. See `.env.example` for the registration steps.
- **Pre-call warm-up email for the visitor** — on booking confirmation, a short personalized note referencing the visitor's own stated situation. Reuses `Lead.answersJson` and the summarization pattern in `pre-call-briefing.service.ts`; new surface is just an email + prompt.
- **Ghost recovery** — when a `NO_RESPONSE` lead generates a new matching `Visit`, trigger a contextual re-engagement follow-up. Reuses visit stitching + outcome data.
- **Shadow calendaring (protective-only)** — a professional claims a block of time for a stated goal and Gate won't offer it as bookable. Deliberately does *not* auto-decline or reschedule existing invites. Reuses the calendar-provider abstraction.

## Gated on the lawyer interviews (6)

- **Cookie consent for `gate_visitor_id`** — first-party, httpOnly, 1-year random ID used for lead-source attribution. Open question: "strictly necessary" under ePrivacy (no banner), or consent required before it's set? Attribution cookies usually don't qualify, so expect a banner or a consent-gated cookie. Already disclosed on `/privacy`; don't code around it before the answer.
- **EU / German data hosting** — mandatory once handling regulated-profession data, part of the "right to operate," not a checkbox
- **`PENDING_REVIEW` decision logic** — wire the already-modeled but unused state into the AI, only if "assisted not autonomous" is what validates
- **Conflict-of-interest intake** — a real legal requirement; meetergo already has this, Gate doesn't
- **Register-adaptive AI prompts** — technical language with the expert, plain language with the end user
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
