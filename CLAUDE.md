# Gate (Expert Gatekeeper)

A Google-first *gated* booking platform for professionals. Not a generic
scheduler — the core idea is access control: visitors must qualify (via an AI
screening conversation) before they can see booking slots.

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
  calendar event creation, sync Google calendars, and check OAuth token
  health.

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
