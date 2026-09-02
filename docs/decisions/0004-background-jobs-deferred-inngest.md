# 0004 — Background jobs stay on manual/HTTP trigger for now

## Context

Every job in `server/jobs/` (hold expiry, calendar sync, event-creation
retry, token-health checks, outcome follow-ups, pattern reports, monthly
token-balance reset) runs the same way today: a top-level exported async
function, invoked via an authenticated HTTP POST to a thin route in
`app/api/jobs/*/route.ts`, looping synchronously over every eligible record
in one pass. There's no cron trigger and no fan-out — one request processes
everything.

## Decision

Leave this as-is for now. Recommended eventual fix (researched, not yet
built): **Inngest** — cron triggers replace manual invocation, fan-out (one
event per record, processed independently with automatic retry) replaces the
single-request loop, and Inngest's own request signing replaces the current
session-based auth on these routes. Chosen over Trigger.dev (heavier workload
model than Gate needs) and QStash (no built-in fan-out); Inngest's free tier
(25k runs/month) comfortably covers this project's current scale.

## Why

This doesn't scale past a handful of test accounts — a synchronous loop over
every eligible record in one HTTP request will eventually time out or process
partially. But a beta of a handful of testers doesn't produce enough volume
for that to matter yet, and deferring costs nothing architecturally: a later
webhook/fan-out-based version slots into the same job-function-per-concern
pattern rather than requiring a redesign. Building it now would be solving a
scale problem that doesn't exist yet, ahead of the validation work that
determines whether this product has users at that scale at all.

## Status

Explicitly deferred, not forgotten. Revisit once there's a real reason to
believe job volume is approaching what a single synchronous pass can't
handle — not on a fixed timeline.
