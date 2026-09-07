-- Migration: add_qualification_mode
-- Replaces services.qualification_required (boolean) with a 3-state
-- services.qualification_mode: OPEN (no screening), TRIAGE (AI screens and
-- reports fit to the professional, but never blocks booking), GATEKEEPER
-- (today's behavior — a poor-fit verdict blocks booking).
--
-- The backfill below is the load-bearing step: a naive drop-and-recreate
-- would default every row to OPEN and silently un-gate every currently
-- strict-gated service. Preserving qualification_required = true as
-- GATEKEEPER (not the new column's own default) is what keeps existing
-- professionals' gates working exactly as before.

CREATE TYPE "QualificationMode" AS ENUM ('OPEN', 'TRIAGE', 'GATEKEEPER');

ALTER TABLE "services" ADD COLUMN "qualification_mode" "QualificationMode" NOT NULL DEFAULT 'OPEN';

UPDATE "services"
SET "qualification_mode" = CASE WHEN "qualification_required" THEN 'GATEKEEPER' ELSE 'OPEN' END::"QualificationMode";

ALTER TABLE "services" DROP COLUMN "qualification_required";
