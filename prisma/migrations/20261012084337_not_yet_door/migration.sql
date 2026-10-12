-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "not_yet_ready_when" TEXT,
ADD COLUMN     "not_yet_returned_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "qualification_conversations" ADD COLUMN     "returning_from_lead_id" TEXT;
