-- AlterTable
ALTER TABLE "availability_rules" ADD COLUMN     "priority_only" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "is_strong_fit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "standard_availability_exposure" "AvailabilityExposure";
