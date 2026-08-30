-- Migration: add_plan_tier
-- First real pricing tiers, replacing the flat 10000-tokens-for-everyone
-- placeholder. Tier limits (max active services, monthly AI-qualification
-- token allowance) live in code (lib/constants.ts PLAN_TIER_LIMITS), not
-- the database, so pricing can change without a migration.
--
--   professionals.plan_tier                FREE / PRO / BUSINESS. Defaults
--                                           FREE for every existing row.
--   professionals.token_balance_reset_at    Set by the monthly reset job
--                                           (server/jobs/reset-token-balances.job.ts).
--                                           NULL = never reset yet.
--
-- token_balance's default moves from 10000 to 15000 (the FREE tier
-- allowance) for newly-created professionals; existing rows keep whatever
-- balance they already have until the next monthly reset normalizes them.

CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'BUSINESS');

ALTER TABLE "professionals"
  ADD COLUMN "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "token_balance_reset_at" TIMESTAMP(3),
  ALTER COLUMN "token_balance" SET DEFAULT 15000;
