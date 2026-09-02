# Gate (Expert Gatekeeper)

A Google-first *gated* booking platform for professionals. Not a generic
scheduler — the core idea is access control: visitors must qualify (via an AI
screening conversation) before they can see booking slots.

**Before assuming project context isn't captured anywhere:** check
`docs/STATUS.md` (what's built vs. left, grouped by what's gating it) and
`docs/decisions/` (short ADRs on the non-obvious calls — pricing model,
the calendar-provider abstraction, the embed widget's CSP scoping, why
background jobs aren't on real cron yet). Those are the canonical record,
not any earlier conversation.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Prisma + PostgreSQL ·
Zod · React Hook Form · NextAuth · Google Calendar API · OpenAI (`gpt-4o-mini`)
· Resend (email) · Sentry

## Architecture

```
app/       routes, pages, API endpoints (route handlers stay thin)
components/  UI, grouped by feature (booking, calendars, control-room, ...)
lib/       shared utils, env validation, db client, auth, logger
server/    services -> repositories -> validators, plus background jobs
prisma/    schema.prisma + migrations
types/     shared TypeScript types
hooks/     frontend data-fetching hooks
tests/     unit (server/lib) + integration (cross-service flows)
scripts/   one-off ops scripts (admin creation, demo seeding, hold cleanup)
```

Request flow convention: **API route -> service -> repository -> Prisma**.
Validation lives in `server/validators` (Zod schemas), not inline in routes.
Follow this layering when adding features rather than reaching into Prisma
directly from a route or component.

## Core domain model

`Professional` -> `Service` (has `idealPersonaDescription`) -> `Lead` ->
`BookingHold` -> `Booking` -> `CalendarEvent`.

- **AI qualification gate** (`server/services/ai-conversation.service.ts`,
  `app/api/public/qualification/chat/route.ts`) is stateless per request: the
  client resends the full chat history each turn (capped at 40 messages), the
  server does not persist conversation state between calls. The final
  decision + transcript are written once to `Lead.answersJson`. There is no
  cross-session memory — a returning visitor starts cold.
- `Professional.tokenBalance` meters OpenAI usage per professional and is
  decremented per call. The AI **fails open** on any error, non-JSON
  response, or exhausted balance — it auto-qualifies rather than blocking a
  visitor. This is intentional; do not "fix" it into fail-closed.
- Booking confirmation uses **static access codes**, not payments — a
  deliberate v1 constraint, not a missing feature.
- Background jobs (`server/jobs/`): expire stale `BookingHold`s, retry failed
  calendar event creation, sync Google calendars, check OAuth token health,
  send outcome follow-ups, send pattern reports, and reset monthly AI
  allowances. Each is a thin session-gated `app/api/jobs/*/route.ts` POST
  calling one top-level exported job function — see `CONTRIBUTING.md`. Not
  on real cron yet (`docs/decisions/0004-background-jobs-deferred-inngest.md`).
- **Plan tiers** (`Professional.planTier`, limits in `lib/constants.ts`
  `PLAN_TIER_LIMITS`): FREE/PRO/BUSINESS control the active-`Service` cap
  (enforced in `service-catalog.service.ts`) and the monthly AI-qualification
  token allowance (reset by `server/jobs/reset-token-balances.job.ts`, no
  rollover). Billing is tied to confirmed bookings, not self-reported
  outcomes — see `docs/decisions/0002-plan-tier-billing-model.md`. Stripe
  checkout/subscriptions/webhooks are **not built** — nothing collects
  payment or moves a professional between tiers yet.
- **Embeddable booking widget** (`public/embed.js` + `/embed/[slug]`): lets a
  professional open their gate in a popup on their own site. `/embed/[slug]`
  renders identically to `/[slug]` (both share
  `server/services/public-sales-page.service.ts`) but is the only route with
  relaxed `frame-ancestors` in `next.config.ts` — see
  `docs/decisions/0003-embed-widget-frame-ancestors.md` before touching that
  file's header-scoping regex.
- **Anonymous visit stitching** (`Visit` model, `gate_visitor_id` cookie set
  by `app/api/public/visits/route.ts`): logs every hit on a professional's
  public page and backfills matching visits onto a `Lead` the moment one is
  created, so the leads inbox shows the full path to a lead, not just the
  last referrer.
- **Pre-call briefing** (`Lead.briefingSummary`/`briefingGeneratedAt`,
  `server/services/pre-call-briefing.service.ts`): AI summary of a lead's
  qualification transcript, generated once and cached, surfaced in the
  Bookings dialog before a call.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run db:migrate` | New Prisma migration after schema changes |
| `npm run db:studio` | Prisma Studio at localhost:5555 |
| `npm run db:seed` | Re-seed demo data (wipes existing data) |
| `npm test` / `test:watch` / `test:coverage` | Vitest |

## Testing philosophy

- **Everything external is mocked** — repositories, other services, Google
  Calendar API, OpenAI, email. Unit tests (`tests/unit`) exercise a single
  service against `vi.fn()` mocks of its dependencies. "Integration" tests
  (`tests/integration`) exercise a cross-service flow (e.g. the full public
  booking flow) but still mock the services underneath — there is no real
  Postgres or external API call in the suite. `tests/setup.ts` only stubs
  enough env vars for server modules to import cleanly.
- Coverage thresholds in `vitest.config.ts` are intentionally low
  (lines 8% / functions 4% / branches 5% / statements 8%). Treat this as a
  **regression floor**, not a target — it exists to catch large untested
  additions, not to imply 8% coverage is the goal.
- When adding a service, prefer testing it the same way existing tests do:
  hoist mocks for every repository/service it imports, `vi.mock` the module,
  and assert on behavior (calls made, values returned) rather than
  implementation details.
- Fail-open paths (AI errors, exhausted token balance) are behavior, not
  edge cases to "handle away" — write tests that assert the fallback fires,
  not tests that assume the happy path always runs.

## Gotchas

- `.env` vs `.env.example`: Google Calendar, Resend, and OpenAI keys are all
  optional locally — corresponding features degrade gracefully (no calendar
  sync, no email send, auto-qualify) rather than crashing.
- Public API routes are rate-limited per IP (`lib/rate-limit.ts`) — expect
  429s under repeated local testing of the same endpoint.
