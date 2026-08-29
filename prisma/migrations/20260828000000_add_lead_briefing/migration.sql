-- Migration: add_lead_briefing
-- Pre-call briefing: an AI-generated prep note derived from a lead's
-- qualification transcript, surfaced in the Bookings dialog before a call.
-- Generated once and cached on the Lead (not the Booking) since it's a
-- property of the conversation, not any particular slot — regenerating on
-- every booking view would burn tokens for no reason.
--
--   leads.briefing_summary        { summary, keyPoints, suggestedOpening },
--                                  or NULL if never generated.
--   leads.briefing_generated_at   NULL = not generated yet.

ALTER TABLE "leads"
  ADD COLUMN "briefing_summary" JSONB,
  ADD COLUMN "briefing_generated_at" TIMESTAMP(3);
