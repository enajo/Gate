# Expert Gatekeeper

A Google-first gated booking platform for professionals.

Professionals can create a branded public page, qualify leads before access, connect multiple Google calendars for conflict checking, choose one calendar for confirmed bookings, and unlock bookings with static access codes.

## Quick start

### Option A — GitHub Codespaces (one click, no local setup)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME)

1. Click the badge above (or **Code → Codespaces → Create codespace**)
2. Wait ~2 minutes while the container installs dependencies, migrates the DB, and seeds demo data
3. The app opens automatically at the forwarded port 3000
4. Log in with `john@example.com` or `sarah@example.com`

> **Google Calendar & email** — add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `RESEND_API_KEY`
> to the Codespace's secret settings (or edit `.env` inside the terminal) to enable those features.

---

### Option B — Local development

**Prerequisites:** Node.js ≥ 20, PostgreSQL 14+

```bash
# 1. Clone and enter the project
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git gate
cd gate

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — at minimum set NEXTAUTH_SECRET and AUTH_SECRET

# 4. Create the database and run migrations
createdb gatekeeper          # or create it via psql / pgAdmin
npx prisma migrate deploy

# 5. Seed demo data (optional but recommended)
npm run db:seed

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Useful commands**

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run db:migrate` | Create a new migration after schema changes |
| `npm run db:studio` | Open Prisma Studio at [localhost:5555](http://localhost:5555) |
| `npm run db:seed` | Re-seed with demo data (wipes existing data) |
| `npm run typecheck` | Full TypeScript type check |

---

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