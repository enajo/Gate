-- Migration: add_lead_outcome
-- Low-friction outcome tracking: a one-click follow-up email asks whether a
-- qualified lead actually became a client, instead of a dashboard button
-- nobody clicks. This is the verifiability signal outcome-based pricing and
-- the correction loop both depend on.
--
--   leads.outcome                   WON / LOST / NO_RESPONSE, set by the
--                                    professional clicking a link in the
--                                    follow-up email. NULL = not answered yet.
--   leads.outcome_value              Deal value if WON, in whole currency
--                                    units. Optional.
--   leads.outcome_token              Unguessable token embedded in the
--                                    follow-up email link — lets the
--                                    professional respond with one click,
--                                    no login required.
--   leads.outcome_responded_at       When they answered.
--   leads.outcome_follow_up_sent_at  When the follow-up email went out —
--                                    prevents sending it twice.

CREATE TYPE "LeadOutcome" AS ENUM ('WON', 'LOST', 'NO_RESPONSE');

ALTER TABLE "leads"
  ADD COLUMN "outcome" "LeadOutcome",
  ADD COLUMN "outcome_value" INTEGER,
  ADD COLUMN "outcome_token" TEXT,
  ADD COLUMN "outcome_responded_at" TIMESTAMP(3),
  ADD COLUMN "outcome_follow_up_sent_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "leads_outcome_token_key" ON "leads"("outcome_token");
