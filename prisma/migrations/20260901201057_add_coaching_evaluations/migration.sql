-- CreateEnum
CREATE TYPE "EvaluationConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ObservationSource" AS ENUM ('GAME', 'PRACTICE', 'GENERAL');

-- CreateEnum
CREATE TYPE "ObservationCategory" AS ENUM ('SKATING', 'SPEED', 'PUCK_CONTROL', 'PASSING', 'SHOOTING', 'HOCKEY_IQ', 'COMPETE', 'DEFENSE', 'POSITIONING', 'TEAM_PLAY', 'LEADERSHIP', 'GOALTENDING', 'CHEMISTRY', 'OTHER');

-- CreateTable
CREATE TABLE "PlayerEvaluation" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "coachRank" INTEGER,
    "primaryPosition" "Position",
    "secondaryPositions" "Position"[],
    "playerType" TEXT,
    "confidence" "EvaluationConfidence" NOT NULL DEFAULT 'LOW',
    "skating" INTEGER,
    "speed" INTEGER,
    "puckControl" INTEGER,
    "passing" INTEGER,
    "shooting" INTEGER,
    "hockeyIQ" INTEGER,
    "compete" INTEGER,
    "defensiveAbility" INTEGER,
    "positioning" INTEGER,
    "teamPlay" INTEGER,
    "strengths" TEXT,
    "developmentPriorities" TEXT,
    "coachNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachObservation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ObservationSource" NOT NULL,
    "category" "ObservationCategory" NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerEvaluation_playerId_idx" ON "PlayerEvaluation"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerEvaluation_seasonId_playerId_key" ON "PlayerEvaluation"("seasonId", "playerId");

-- CreateIndex
CREATE INDEX "CoachObservation_teamId_date_idx" ON "CoachObservation"("teamId", "date");

-- CreateIndex
CREATE INDEX "CoachObservation_playerId_date_idx" ON "CoachObservation"("playerId", "date");

-- CreateIndex
CREATE INDEX "CoachObservation_gameId_idx" ON "CoachObservation"("gameId");

-- CreateIndex
CREATE INDEX "CoachObservation_seasonId_idx" ON "CoachObservation"("seasonId");

-- AddForeignKey
ALTER TABLE "PlayerEvaluation" ADD CONSTRAINT "PlayerEvaluation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEvaluation" ADD CONSTRAINT "PlayerEvaluation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachObservation" ADD CONSTRAINT "CoachObservation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachObservation" ADD CONSTRAINT "CoachObservation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachObservation" ADD CONSTRAINT "CoachObservation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachObservation" ADD CONSTRAINT "CoachObservation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
