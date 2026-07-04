-- Move idealPersonaDescription from professionals → services
-- professionals already has the column from the previous migration;
-- services does not yet have it.

ALTER TABLE "professionals"
  DROP COLUMN "ideal_persona_description";

ALTER TABLE "services"
  ADD COLUMN "ideal_persona_description" TEXT;
