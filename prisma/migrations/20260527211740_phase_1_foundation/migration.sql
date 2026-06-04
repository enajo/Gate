-- CreateEnum
CREATE TYPE "AvailabilityExposure" AS ENUM ('THREE_DAYS', 'FIVE_DAYS', 'ONE_WEEK', 'TWO_WEEKS', 'ONE_MONTH', 'TWO_MONTHS', 'ALL');

-- CreateEnum
CREATE TYPE "BookingEventType" AS ENUM ('HOLD_CREATED', 'HOLD_EXPIRED', 'HOLD_CONVERTED', 'BOOKING_CONFIRMED', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'CALENDAR_EVENT_CREATED', 'CALENDAR_EVENT_FAILED', 'EMAIL_SENT', 'EMAIL_FAILED', 'ACCESS_CODE_VALIDATED', 'ACCESS_CODE_ROTATED', 'MANUALLY_APPROVED', 'MANUALLY_REJECTED');

-- AlterEnum
ALTER TYPE "LeadQualificationResult" ADD VALUE 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "access_codes" ADD COLUMN     "service_id" TEXT;

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "public_page_settings" JSONB,
ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "access_code_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availability_exposure" "AvailabilityExposure" NOT NULL DEFAULT 'TWO_WEEKS',
ADD COLUMN     "currency" TEXT DEFAULT '$',
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "manual_approval_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meeting_format" TEXT DEFAULT 'Video call',
ADD COLUMN     "payment_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualification_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "testimonials" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rating" INTEGER;

-- CreateTable
CREATE TABLE "booking_events" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "type" "BookingEventType" NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_events_booking_id_created_at_idx" ON "booking_events"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "access_codes_service_id_is_active_idx" ON "access_codes"("service_id", "is_active");

-- AddForeignKey
ALTER TABLE "access_codes" ADD CONSTRAINT "access_codes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
