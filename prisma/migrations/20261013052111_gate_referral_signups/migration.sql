-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "referred_by_professional_id" TEXT,
ADD COLUMN     "signup_source" TEXT;

-- CreateIndex
CREATE INDEX "professionals_referred_by_professional_id_idx" ON "professionals"("referred_by_professional_id");
