-- Migration: add_lead_source_tracking
-- Adds passive source-attribution columns to leads.
--
--   leads.referrer     Raw Referer header captured on the visitor's first
--                       hit to the public page (e.g. "https://chatgpt.com/").
--   leads.utm_source   \
--   leads.utm_medium    > Standard UTM params, if the professional tagged
--   leads.utm_campaign / their link.
--
-- All nullable — most visits will have none of these (direct traffic,
-- stripped referrers), which is expected and not an error state.

ALTER TABLE "leads"
  ADD COLUMN "referrer" TEXT,
  ADD COLUMN "utm_source" TEXT,
  ADD COLUMN "utm_medium" TEXT,
  ADD COLUMN "utm_campaign" TEXT;
