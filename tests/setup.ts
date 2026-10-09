// Pin the test process to UTC. availability.service.ts's weekdayFromDate
// double-applies a UTC<->timezone conversion (pre-existing, out of scope
// here) that's a no-op in production (servers run system TZ=UTC) but shifts
// dates across a day boundary on any non-UTC dev machine — making
// date/weekday-sensitive tests flaky depending on who runs them. Pinning TZ
// here matches production's real environment and keeps tests deterministic.
process.env.TZ = "UTC";

// Minimum env vars needed to import server services without crashing.
// The actual values don't matter for unit tests — services mock the DB.
process.env.DATABASE_URL  = "postgresql://test:test@localhost:5432/test";
process.env.AUTH_SECRET   = "test-secret-for-vitest";
process.env.NEXTAUTH_URL  = "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
