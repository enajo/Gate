// Minimum env vars needed to import server services without crashing.
// The actual values don't matter for unit tests — services mock the DB.
process.env.DATABASE_URL  = "postgresql://test:test@localhost:5432/test";
process.env.AUTH_SECRET   = "test-secret-for-vitest";
process.env.NEXTAUTH_URL  = "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
