/*
  Warnings:

  - A unique constraint covering the columns `[teamId,externalSource,externalGameId]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'FINAL', 'CANCELLED');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "externalDivisionId" TEXT,
ADD COLUMN     "externalGameId" TEXT,
ADD COLUMN     "externalSeasonId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "externalTeamId" TEXT,
ADD COLUMN     "status" "GameStatus" NOT NULL DEFAULT 'FINAL',
ALTER COLUMN "result" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Game_teamId_status_idx" ON "Game"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Game_teamId_externalSource_externalGameId_key" ON "Game"("teamId", "externalSource", "externalGameId");
