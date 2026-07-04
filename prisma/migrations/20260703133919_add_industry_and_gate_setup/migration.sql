-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "industry" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "gate_setup_answers" JSONB;

-- DropEnum
DROP TYPE "QualificationOutcomeType";

-- DropEnum
DROP TYPE "QuestionType";
