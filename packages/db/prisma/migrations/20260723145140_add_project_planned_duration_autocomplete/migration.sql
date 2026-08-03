-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "completeWithLastAction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "plannedDate" TIMESTAMP(3);
