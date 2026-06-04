-- AlterTable: add single-use tracking fields to access_codes
ALTER TABLE "access_codes" ADD COLUMN "used_at" TIMESTAMP(3);
ALTER TABLE "access_codes" ADD COLUMN "used_by_email" TEXT;
