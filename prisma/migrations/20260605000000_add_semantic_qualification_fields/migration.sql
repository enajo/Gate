-- Migration: add_semantic_qualification_fields
-- Adds two nullable columns to support the AI semantic qualification gate.
--
--   professionals.ideal_persona_description
--     Plain-English description of the expert's ideal client and expectations
--     (Block A). Used as context for the AI semantic router.
--
--   services.direct_purchase_url
--     When set, marks this service as a "direct buy" alternative (no calendar
--     needed). The AI can recommend it to visitors who don't qualify for the
--     core live session. NULL means the service goes through the normal
--     calendar/booking flow.

ALTER TABLE "professionals"
  ADD COLUMN "ideal_persona_description" TEXT;

ALTER TABLE "services"
  ADD COLUMN "direct_purchase_url" TEXT;
