-- Migration: add_onboarding_survey
-- Onboarding now asks the same two-part question Calendly asks at signup
-- ("how will you use this" + "what do you need it for") instead of the old
-- single-select "booking goal" step, which was never even persisted (the
-- field existed in the UI but was dropped before hitting the API).
--
--   professionals.onboarding_survey   { usageMode: "SOLO" | "TEAM", goals: string[] }
--                                     Demand-signal data, not product config —
--                                     no downstream logic reads this yet.

ALTER TABLE "professionals"
  ADD COLUMN "onboarding_survey" JSONB;
