-- Migration: add_lead_correction
-- Lets a professional record that the AI's original decision on a lead was
-- wrong, and what it should have been. This is the correction/override loop:
-- every disagreement becomes structured feedback instead of disappearing.
--
--   leads.corrected_result   The professional's override, using the same
--                            enum as qualification_result. NULL means the
--                            lead has never been reviewed/corrected.
--   leads.correction_note    Optional free-text reason for the override.
--   leads.corrected_at       When the correction was made.

ALTER TABLE "leads"
  ADD COLUMN "corrected_result" "LeadQualificationResult",
  ADD COLUMN "correction_note" TEXT,
  ADD COLUMN "corrected_at" TIMESTAMP(3);
