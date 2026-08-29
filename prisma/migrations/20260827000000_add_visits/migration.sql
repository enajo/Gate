-- Migration: add_visits
-- Anonymous visit stitching: logs every hit on a professional's public page
-- (via an anonymous visitor cookie), then links those visits to a Lead the
-- moment one exists — so the dashboard can show the full path a visitor
-- took before they ever filled out a form, not just their last referrer.
--
--   visits.visitor_id    Value of the gate_visitor_id cookie, set by
--                         POST /api/public/visits. Not a real identity —
--                         just enough to group a browser's hits together.
--   visits.lead_id        NULL until a Lead is created for this visitor,
--                         at which point matching rows are backfilled.
--                         SET NULL on Lead deletion — the visit itself is
--                         still meaningful history.

CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "landing_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "visits_professional_id_visitor_id_idx" ON "visits"("professional_id", "visitor_id");

CREATE INDEX "visits_lead_id_idx" ON "visits"("lead_id");

ALTER TABLE "visits" ADD CONSTRAINT "visits_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visits" ADD CONSTRAINT "visits_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
