-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('parallel', 'sequential');

-- AlterTable
ALTER TABLE "Action" ADD COLUMN     "completeWithLastAction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" "ActionType" NOT NULL DEFAULT 'parallel';
