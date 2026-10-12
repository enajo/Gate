# 0002 — Plan tier billing model

## Context

Gate needed its first real pricing tiers, moving off a flat 10,000-token
allowance given to every professional regardless of plan. Three separate
questions had to be answered: what triggers a charge, what the free tier
includes, and what happens when a paid professional stops paying.

## Decision

- **Billing trigger is confirmed bookings, not self-reported outcomes.**
  `Booking.status` is a first-party, server-observed fact. `Lead.outcome`
  (WON/LOST/NO_RESPONSE) is entirely self-reported via a one-click follow-up
  email — a professional could simply never click "Won" to avoid being
  charged on it. Outcome data stays a value-prop/analytics layer (Pattern
  Report, "here's what you're winning"), not something invoiced against.
- **Free tier is shaped like Calendly's, not Cal.com's or HubSpot's**: limited
  by feature scope (1 active `Service`) with unlimited bookings on it, not by
  booking volume. Chosen because Cal.com's generosity comes from
  per-seat/team monetization (doesn't fit a solo-expert audience), and
  HubSpot's free scheduler is a CRM loss-leader, not a comparable case.
- **AI screening is capped on the lower tiers** — it costs real per-call
  OpenAI money, unlike bookings or calendar sync. Exhausting the allowance
  still fails open to auto-qualify rather than blocking a visitor, and the
  expert is emailed once per period.
- **Metered in conversations, not tokens (changed 2026-10-12).** One
  conversation = one visitor's screening chat that reaches a decision
  (QUALIFIED or REJECTED). Abandoned chats and fail-open outcomes are free
  — the expert pays for decisions, not attempts; cost from unfinished chats
  is bounded by the per-visitor cap and per-conversation AI-call cap. Tokens were the wrong
  unit to sell: experts can't reason about them, and live tests showed a
  real conversation costs ~3–5k tokens, not the ~1.5k the old 15k-token
  free tier assumed — it was really ~4 conversations, not the ~10 promised.
  Cost per conversation is still bounded server-side (server-held history,
  `MAX_AI_CALLS_PER_CONVERSATION`).
- **Final tiers**: FREE ($0, 1 service, 10 conversations/mo) → PRO ($29/mo,
  unlimited services, 100 conversations/mo) → BUSINESS ($79/mo, unlimited
  services, unlimited conversations under fair use — abuse is bounded by
  per-visitor caps and rate limits, not an allowance). Limits live in code
  (`lib/constants.ts` `PLAN_TIER_LIMITS`), not the database, so pricing can
  change without a migration.
- **Non-payment handling: soft-lock, never touch existing commitments.** Once
  Stripe's dunning/retries exhaust and a subscription goes `unpaid`: stop new
  lead intake and new bookings for that professional, but leave bookings
  already confirmed completely untouched — those are commitments to a real
  client, unrelated to the professional's billing status.

## Why

A consultant would rightly refuse to route their real client pipeline through
billing logic they can quietly opt out of. Tying money to a fact only Gate
itself observes (a booking existing) removes that failure mode entirely.
Capping free AI usage isn't a growth-limiting choice, it's a cost-control
necessity — unlike scheduling or calendar sync, every AI qualification call
has a real, non-zero marginal cost.

## Alternatives considered

- **Outcome-based / revenue-share pricing** (a % of a WON deal). The
  economically "purest" model and the first instinct, but rejected as the
  *billing trigger* for the reason above. True revenue-verified pricing would
  require Gate sitting inside the actual payment flow (Stripe Connect,
  processing the client's payment directly) — a much bigger business-model
  shift (becoming a payments intermediary), treated as a separate, future
  decision, not conflated with these tiers.
- **Pay-as-you-go top-ups** instead of flat tiers for overage. Rejected
  in favor of flat tiers — a wallet/credits system means two billing
  mechanisms (subscriptions + one-time charges) instead of one, which cuts
  against the project's standing "keep it simple" bias (a beta-tester
  consultant's direct feedback about meetergo being too complex to manage).

## Status

Data model and enforcement are built and verified live (active-service cap,
monthly reset job). **Stripe checkout/subscriptions/webhooks are not built**
— nothing currently collects payment or moves a professional between tiers.
Blocked on a Stripe account + API keys before that piece can be built and
verified against something real.
