# Expert Gatekeeper

A Google-first gated booking platform for professionals.

Professionals can create a branded public page, qualify leads before access, connect multiple Google calendars for conflict checking, choose one calendar for confirmed bookings, and unlock bookings with static access codes.

## Core idea

This product is not a generic scheduler.

It is an expert access-control system built around:

- qualification before booking
- controlled availability
- multi-calendar conflict checking
- static code validation instead of payments in V1
- automatic event creation after successful confirmation

## Tech stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Zod
- React Hook Form
- Google Calendar API
- Resend

## Project structure

```text
app/            # routes, pages, API endpoints
components/     # UI and feature components
lib/            # shared utilities, env, db, auth
server/         # services, repositories, validators, jobs
prisma/         # schema and migrations
types/          # shared TypeScript types
hooks/          # frontend hooks
public/         # static assets
tests/          # unit and integration tests
scripts/        # helper scripts