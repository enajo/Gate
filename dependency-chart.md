# Gate — Codebase Dependency Chart

```mermaid
graph TD

  %% ── External Systems ──────────────────────────────────────────────────────
  subgraph EXT["🌐 External Systems"]
    PG[(PostgreSQL)]
    GOAUTH[Google OAuth\n+ Calendar API]
    OPENAI[OpenAI GPT]
    RESEND[Resend\nEmail]
    NEXTAUTH[NextAuth]
  end

  %% ── Lib Layer ─────────────────────────────────────────────────────────────
  subgraph LIB["📦 lib/ — Shared Utilities"]
    db[db.ts\nPrisma client]
    auth[auth.ts\nNextAuth config]
    email_lib[email.ts\nResend client]
    env[env.ts\nEnv vars]
    crypto[crypto.ts\nEncrypt / Hash]
    logger[logger.ts]
    constants[constants.ts]
    dates[dates.ts]
  end

  %% ── Repository Layer ──────────────────────────────────────────────────────
  subgraph REPOS["🗄️ server/repositories/"]
    profile_repo[profile.repository]
    service_repo[service.repository]
    booking_repo[booking.repository]
    google_repo[google.repository]
    access_repo[access-code.repository]
    avail_repo[availability.repository]
    qual_repo[qualification.repository]
    notif_repo[notification.repository]
    user_repo[user.repository]
  end

  %% ── Service Layer ─────────────────────────────────────────────────────────
  subgraph SERVICES["⚙️ server/services/"]
    profile_svc[profile.service]
    svcatalog_svc[service-catalog.service]
    booking_svc[booking.service]
    avail_svc[availability.service]
    access_svc[access-code.service]
    qual_svc[qualification.service]
    email_svc[email.service]
    ai_svc[ai-qualification.service]
    google_auth_svc[google-auth.service]
    google_cal_svc[google-calendar.service]
    google_sync_svc[google-sync.service]
    onboarding_svc[onboarding.service]
    notif_svc[notification.service]
  end

  %% ── Public API Routes ─────────────────────────────────────────────────────
  subgraph PUBLIC["🌍 app/api/public/"]
    pub_slots[/public/slots]
    pub_holds[/public/holds]
    pub_confirm[/public/bookings/confirm]
    pub_submit[/public/qualification/submit]
    pub_ai[/public/qualification/ai-submit]
    pub_contact[/public/qualification/contact]
    pub_validate[/public/access-codes/validate]
    pub_prof[/public/professionals/slug]
    pub_svcs[/public/services/slug]
  end

  %% ── Dashboard API Routes ──────────────────────────────────────────────────
  subgraph DASHBOARD["🔐 app/api/app/ — Authenticated"]
    dash_profile[/app/profile]
    dash_cr[/app/control-room]
    dash_svc[/app/services]
    dash_codes[/app/access-codes]
    dash_avail[/app/availability]
    dash_qual[/app/qualification]
    dash_bookings[/app/bookings]
    dash_holds[/app/holds]
    dash_google[/app/google/\ncalendars + callback + connect]
  end

  %% ── Background Jobs ───────────────────────────────────────────────────────
  subgraph JOBS["⏱️ server/jobs/ + app/api/jobs/"]
    job_sync[sync-google-calendars]
    job_expire[expire-holds]
    job_retry[retry-events]
    job_health[token-health-check]
  end

  %% ── Lib → External ────────────────────────────────────────────────────────
  db --> PG
  auth --> NEXTAUTH
  email_lib --> RESEND

  %% ── Repos → Lib ───────────────────────────────────────────────────────────
  profile_repo --> db
  service_repo --> db
  booking_repo --> db
  google_repo --> db
  access_repo --> db
  avail_repo --> db
  qual_repo --> db
  notif_repo --> db
  user_repo --> db

  %% ── Services → Repos ──────────────────────────────────────────────────────
  profile_svc --> profile_repo
  profile_svc --> service_repo

  svcatalog_svc --> profile_repo

  booking_svc --> booking_repo
  booking_svc --> profile_repo
  booking_svc --> service_repo
  booking_svc --> google_repo

  avail_svc --> avail_repo
  avail_svc --> booking_repo
  avail_svc --> profile_repo
  avail_svc --> service_repo

  access_svc --> access_repo
  access_svc --> profile_repo

  qual_svc --> qual_repo
  qual_svc --> booking_repo
  qual_svc --> profile_repo
  qual_svc --> service_repo

  google_cal_svc --> google_repo
  google_cal_svc --> profile_repo

  google_sync_svc --> google_repo
  google_sync_svc --> booking_repo
  google_sync_svc --> profile_repo

  notif_svc --> booking_repo
  notif_svc --> notif_repo

  onboarding_svc --> profile_repo
  onboarding_svc --> service_repo
  onboarding_svc --> avail_repo
  onboarding_svc --> qual_repo
  onboarding_svc --> access_repo
  onboarding_svc --> google_repo

  %% ── Services → Lib ────────────────────────────────────────────────────────
  access_svc --> crypto
  google_auth_svc --> crypto
  notif_svc --> crypto
  email_svc --> email_lib
  email_svc --> logger
  ai_svc --> env
  ai_svc --> logger
  booking_svc --> constants
  booking_svc --> dates
  booking_svc --> env
  booking_svc --> logger
  avail_svc --> constants
  google_cal_svc --> dates

  %% ── Services → External ───────────────────────────────────────────────────
  ai_svc --> OPENAI
  google_auth_svc --> GOAUTH
  google_cal_svc --> GOAUTH

  %% ── Services → Services ───────────────────────────────────────────────────
  booking_svc --> access_svc
  booking_svc --> avail_svc
  booking_svc --> email_svc
  booking_svc --> google_cal_svc
  google_sync_svc --> google_auth_svc
  google_sync_svc --> google_cal_svc
  onboarding_svc --> profile_svc

  %% ── Public Routes → Services / Repos ──────────────────────────────────────
  pub_slots --> avail_svc
  pub_holds --> booking_svc
  pub_holds --> access_svc
  pub_holds --> email_svc
  pub_confirm --> booking_svc
  pub_submit --> qual_svc
  pub_ai --> ai_svc
  pub_ai --> booking_repo
  pub_ai --> profile_repo
  pub_ai --> service_repo
  pub_contact --> email_svc
  pub_contact --> profile_repo
  pub_validate --> access_svc
  pub_prof --> profile_svc
  pub_svcs --> svcatalog_svc

  %% ── Dashboard Routes → Services ───────────────────────────────────────────
  dash_profile --> profile_svc
  dash_profile --> onboarding_svc
  dash_cr --> profile_svc
  dash_svc --> svcatalog_svc
  dash_codes --> access_svc
  dash_avail --> avail_svc
  dash_qual --> qual_svc
  dash_bookings --> booking_svc
  dash_holds --> booking_svc
  dash_google --> google_sync_svc
  dash_google --> google_auth_svc

  %% ── Auth middleware → lib/auth ────────────────────────────────────────────
  dash_profile --> auth
  dash_cr --> auth
  dash_svc --> auth
  dash_codes --> auth
  dash_avail --> auth
  dash_qual --> auth
  dash_bookings --> auth
  dash_holds --> auth
  dash_google --> auth

  %% ── Jobs → Services ───────────────────────────────────────────────────────
  job_sync --> google_sync_svc
  job_expire --> booking_repo
  job_retry --> google_cal_svc
  job_health --> google_auth_svc

  %% ── Styles ────────────────────────────────────────────────────────────────
  classDef ext    fill:#FEF3C7,stroke:#D97706,color:#78350F
  classDef lib    fill:#EFF6FF,stroke:#3B82F6,color:#1E40AF
  classDef repo   fill:#F0FDF4,stroke:#22C55E,color:#14532D
  classDef svc    fill:#FDF4FF,stroke:#A855F7,color:#581C87
  classDef pub    fill:#FFF7ED,stroke:#F97316,color:#7C2D12
  classDef dash   fill:#F0F9FF,stroke:#0EA5E9,color:#0C4A6E
  classDef job    fill:#FEF2F2,stroke:#EF4444,color:#7F1D1D

  class PG,GOAUTH,OPENAI,RESEND,NEXTAUTH ext
  class db,auth,email_lib,env,crypto,logger,constants,dates lib
  class profile_repo,service_repo,booking_repo,google_repo,access_repo,avail_repo,qual_repo,notif_repo,user_repo repo
  class profile_svc,svcatalog_svc,booking_svc,avail_svc,access_svc,qual_svc,email_svc,ai_svc,google_auth_svc,google_cal_svc,google_sync_svc,onboarding_svc,notif_svc svc
  class pub_slots,pub_holds,pub_confirm,pub_submit,pub_ai,pub_contact,pub_validate,pub_prof,pub_svcs pub
  class dash_profile,dash_cr,dash_svc,dash_codes,dash_avail,dash_qual,dash_bookings,dash_holds,dash_google dash
  class job_sync,job_expire,job_retry,job_health job
```

## Legend

| Colour | Layer |
|---|---|
| 🟡 Yellow | External Systems (PostgreSQL, Google, OpenAI, Resend) |
| 🔵 Blue | `lib/` — Shared utilities (db client, env, crypto, logger) |
| 🟢 Green | `server/repositories/` — Data access (Prisma queries) |
| 🟣 Purple | `server/services/` — Business logic |
| 🟠 Orange | `app/api/public/` — Unauthenticated API routes |
| 🩵 Cyan | `app/api/app/` — Authenticated dashboard routes |
| 🔴 Red | Background jobs (cron-triggered) |

## Key architectural observations

- **`booking.service`** is the most connected node — it depends on 4 other services and 4 repositories
- **`lib/db`** is the foundation everything flows through — all repositories converge on it
- **Public routes** bypass auth and flow directly into services/repos
- **Dashboard routes** all pass through `lib/auth` before reaching services
- **`ai-qualification.service`** is intentionally isolated — only talks to `lib/env`, `lib/logger`, and OpenAI
- **Jobs** are thin shells that delegate entirely to services
