# Contributing to Gate

This is the explicit version of conventions that otherwise only exist as
patterns you'd have to notice by reading five files. If you're adding a
feature, matching these makes it consistent with everything else in the
codebase — and makes it easy for the next person (or the next Claude Code
session) to find and extend.

## Request flow: route → service → repository → Prisma

Every feature follows the same layering. Don't reach into Prisma directly
from a route or component — go through a service.

- **`app/api/**/route.ts`** — thin. Auth check, parse/validate input (Zod,
  from `server/validators/`), call one service method, map the result or
  error to a `NextResponse`. No business logic here.
- **`server/services/*.service.ts`** — business logic. Auth/ownership checks
  (via a `requireProfessional(userId)`-style helper), orchestration across
  repositories and other services, throwing plain `Error`s with messages the
  route layer pattern-matches on (see below).
- **`server/repositories/*.repository.ts`** — thin Prisma wrappers. One
  method per query shape. No business logic, no validation — just
  `db.<model>.findX / createX / updateX` with a typed return.
- **`server/validators/*.validator.ts`** — Zod schemas, one per input shape,
  with an inferred `type Foo = z.infer<typeof fooSchema>` export.

## The route error-response pattern

Every route file defines the same two small helpers and a switch-like
`errorResponse()`:

```ts
function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid input", details: error.flatten() }, { status: 422 });
  }

  const message = error instanceof Error ? error.message : "An unexpected error occurred.";

  if (message === "Unauthorized" || message === "Professional profile not found.") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (message === "Some Specific Not Found.") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 400 });
}
```

Services communicate failure by throwing `Error`s with specific, stable
message strings; routes pattern-match on `error.message` to pick the right
HTTP status. It's not elegant, but it's consistent everywhere — copy an
existing route's `errorResponse()` rather than inventing a new error-handling
style (see `app/api/app/services/route.ts` or
`app/api/app/leads/[id]/correction/route.ts` for reference).

## Background jobs

Every job (`server/jobs/*.job.ts`) is a single top-level exported async
function — not a class, not an object with methods — that does its own
`logger.info`/`logger.error` around the work and returns a small result
object (`{ startedAt, finishedAt, ...counts }`). Each gets a thin,
session-gated `POST` route at `app/api/jobs/<name>/route.ts` that just calls
the function and returns its result. See `server/jobs/expire-holds.job.ts`
for the reference shape. Jobs aren't on real cron yet — see
`docs/decisions/0004-background-jobs-deferred-inngest.md`.

## Fail-open, deliberately

Anything that depends on an external service the visitor didn't choose to
use (OpenAI for AI qualification, Google Calendar for conflict checking) is
expected to **fail open**: log the error, degrade gracefully, never block a
visitor from booking. This is a product decision, not a bug — see
`CLAUDE.md`'s "Core domain model" section and
`docs/decisions/0001-calendar-provider-abstraction.md`. Don't "fix" a
fail-open path into fail-closed without discussing it first.

## Testing

Match `tests/unit/booking.service.test.ts`'s shape for a new service test:
`vi.hoisted()` a mock object per dependency, `vi.mock()` the real module to
return it, `describe`/`it` blocks asserting on calls made and values
returned — not implementation details. Repositories and other services are
always mocked; there's no real Postgres or external API call anywhere in the
suite (see `CLAUDE.md`'s testing philosophy section for the full rationale).
Coverage thresholds are a regression floor, not a target — a new feature
doesn't need exhaustive coverage, but its core branches (the happy path, the
one real failure mode, any fail-open path) should have a test each.

## Before committing

Run, in order: `npm run typecheck && npm run lint && npm run test`. For
anything touching a route, a page, or `next.config.ts`, also run `npm run
build` locally — CI now runs it too, but catching it locally is faster.
