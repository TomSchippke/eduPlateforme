-- CreateEnum
CREATE TYPE "VisibilityScope" AS ENUM ('STUDENTS_ONLY', 'AI_ONLY', 'BOTH');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('COURS', 'EXERCICES', 'SUJET_DS', 'CORRECTION_DS', 'CORRECTION_EXERCICES', 'SUJET_DM', 'COMPLEMENTS', 'AUTRE');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "doc_type" "DocumentType" NOT NULL DEFAULT 'AUTRE',
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visibility" "VisibilityScope" NOT NULL DEFAULT 'BOTH';
