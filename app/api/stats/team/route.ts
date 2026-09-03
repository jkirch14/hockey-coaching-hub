export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api";

export async function GET(req: Request) {
    try {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  await requireTeamRole(teamId, "VIEWER");

  const [games, sums, leagueGroups, goalieShutouts] = await Promise.all([
    db.game.findMany({
      where: { teamId, status: "FINAL" },
      select: { result: true, goalsFor: true, goalsAgainst: true, league: true },
    }),
    db.lineupEntry.aggregate({
      where: { teamId, game: { status: "FINAL" } },
      _sum: { penalties: true },
    }),
    db.game.groupBy({
      by: ["league", "result"],
      where: { teamId, status: "FINAL" },
      _count: { _all: true },
    }),
    db.lineupEntry.findMany({
      where: { teamId, position: "G", shutout: true, game: { status: "FINAL" } },
      select: { gameId: true },
      distinct: ["gameId"],
    }),
  ]);

  let wins = 0,
    losses = 0,
    ties = 0,
    goalsFor = 0,
    goalsAgainst = 0;

  for (const g of games) {
    if (g.result === "WIN") wins++;
    else if (g.result === "LOSS") losses++;
    else ties++;

    goalsFor += g.goalsFor ?? 0;
    goalsAgainst += g.goalsAgainst ?? 0;
  }

  const penalties = sums._sum?.penalties ?? 0;
  const shutouts = goalieShutouts.length;
  const goalDiff = goalsFor - goalsAgainst;

  // league breakdown
  const leagueMap: Record<
    string,
    { league: string; wins: number; losses: number; ties: number; games: number }
  > = {};

  for (const row of leagueGroups) {
    const league = row.league ?? "Unspecified";
    leagueMap[league] ??= { league, wins: 0, losses: 0, ties: 0, games: 0 };

    const c = row._count._all;
    leagueMap[league].games += c;

    if (row.result === "WIN") leagueMap[league].wins += c;
    else if (row.result === "LOSS") leagueMap[league].losses += c;
    else leagueMap[league].ties += c;
  }

  const leagues = Object.values(leagueMap).sort((a, b) => b.games - a.games);

  return NextResponse.json({
    teamId,
    totals: {
      games: games.length,
      wins,
      losses,
      ties,
      goalsFor,
      goalsAgainst,
      goalDiff,
      penalties,
      shutouts,
    },
    leagues,
  });
  } catch (err: any) {
    return handleApiError(err);
  }
}


