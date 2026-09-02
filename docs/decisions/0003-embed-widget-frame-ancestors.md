# 0003 — Embed widget frame-ancestors scoping

## Context

The embeddable booking widget (`public/embed.js`) needs to open a
professional's gate inside an `<iframe>` on an arbitrary third-party website
(the professional's own site). Every other route in the app deliberately
forbids being iframed at all (`frame-ancestors 'none'`, `X-Frame-Options:
DENY` in `next.config.ts`) to prevent clickjacking. Relaxing that globally
would reopen clickjacking risk across the entire dashboard and public pages.

## Decision

A dedicated route, `/embed/[slug]`, renders the identical booking experience
as `/[slug]` (both call `server/services/public-sales-page.service.ts`) but
is the *only* route with relaxed `frame-ancestors`. `next.config.ts`'s
`headers()` uses two mutually-exclusive `source` patterns —
`/:path((?!embed/).*)` for the strict rule and `/embed/:path*` for the
relaxed one — rather than one shared rule with conditional logic, so there's
no ambiguity about which CSP header a given request gets (multiple matching
`Content-Security-Policy` headers on the same response don't override each
other, they compound as the most-restrictive intersection per the CSP spec —
mutual exclusivity avoids that failure mode entirely).

`X-Frame-Options` is **deliberately omitted** on the `/embed/*` rule rather
than set to some permissive-sounding value — XFO has no "allow any origin"
value (only `DENY`/`SAMEORIGIN`/deprecated `ALLOW-FROM <origin>`), and a
professional's site could be any domain. Per the CSP3 spec, `frame-ancestors`
supersedes `X-Frame-Options` wherever a policy defines it, so `/embed/*` is
still fully governed by CSP, just via the header actually capable of
expressing "any origin."

## Why

Embedding is a real product requirement, but every other page's protection
against clickjacking needed to stay exactly as strict as before. Keeping the
relaxed rule scoped to one path pattern, verified live via `curl -D -` against
both `/embed/[slug]` and `/[slug]` to confirm the headers actually differ, was
the only way to be confident the rest of the app wasn't accidentally weakened.

## Alternatives considered

- **One shared headers() rule with an if/else on path** inside a single
  `source: "/(.*)"` matcher. Rejected — Next.js's `headers()` config doesn't
  support conditional logic inside a single rule; would have required
  reading response objects per-request in middleware instead, a bigger and
  riskier change to the auth-critical `proxy.ts` middleware.
