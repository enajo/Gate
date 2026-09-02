# Security

## Reporting a vulnerability

This is currently a solo-maintained project. If you find a security issue,
open a private security advisory on GitHub (Security → Advisories → Report a
vulnerability) rather than a public issue.

## Deliberate design choices, not gaps

A few things that look like they might be bugs are intentional — please
raise them in a discussion before "fixing" them:

- **AI qualification fails open.** Any error, non-JSON response, or
  exhausted `tokenBalance` causes the gate to auto-qualify the visitor
  rather than block them. This is a product decision (never let a broken
  integration cost a professional a real lead), not a missing error
  handler. See `CLAUDE.md`.
- **Calendar conflict-checking fails open per-provider.** An unreachable or
  unimplemented calendar provider is skipped (logged as a warning) rather
  than failing the whole availability check. See
  `docs/decisions/0001-calendar-provider-abstraction.md`.
- **`/embed/[slug]` deliberately allows framing from any origin**
  (`frame-ancestors *`, no `X-Frame-Options`) — that's the entire point of
  the embeddable widget. Every other route keeps `frame-ancestors 'none'` /
  `X-Frame-Options: DENY`; see
  `docs/decisions/0003-embed-widget-frame-ancestors.md` before changing
  either rule in `next.config.ts`, since the two header rules are written to
  be mutually exclusive on purpose.

## What's actually in place

- **Rate limiting** on public, unauthenticated routes (`lib/rate-limit.ts`) —
  in-memory, fixed-window, fine for a single instance; swap for a Redis
  counter before scaling to multiple instances.
- **CSP + standard security headers** on every route (`next.config.ts`),
  scoped tighter everywhere except the one embeddable route above.
- **OAuth tokens encrypted at rest** (`lib/crypto.ts`, AES-256-GCM) using
  `ENCRYPTION_SECRET` (falls back to `AUTH_SECRET`/`NEXTAUTH_SECRET` if
  unset — set it explicitly in production; see `.env.example`).
- **Access codes are hashed**, never stored or logged in plaintext
  (`lib/crypto.ts` `hashAccessCode`/`verifyAccessCode`, constant-time
  comparison).
- **Dev-only auth bypass is production-gated** — the no-password dev-email
  credentials provider (`lib/auth.ts`) is excluded from the provider list
  entirely when `NODE_ENV === "production"`.
- **Secret scanning** (gitleaks) and **dependency audit**
  (`npm audit --audit-level=critical`) run on every push/PR via
  `.github/workflows/ci.yml`.

## Known gaps

- **No payment processing yet.** Stripe billing (checkout, subscriptions,
  webhooks) isn't built — see `docs/decisions/0002-plan-tier-billing-model.md`.
  When it is, it needs its own security review (webhook signature
  verification, idempotency, PCI scope).
- **Background jobs run over authenticated HTTP**, not a system designed for
  machine-to-machine auth (API keys, request signing). Fine at current
  scale; revisit alongside `docs/decisions/0004-background-jobs-deferred-inngest.md`.
