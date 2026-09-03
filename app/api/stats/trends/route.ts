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

  const games = await db.game.findMany({
    where: { teamId, status: "FINAL" },
    orderBy: [{ date: "asc" }],
    select: {
      id: true,
      date: true,
      opponent: true,
      league: true,
      goalsFor: true,
      goalsAgainst: true,
      result: true,
    },
  });

  return NextResponse.json({
    teamId,
    games: games.map((g) => ({
      id: g.id,
      date: g.date.toISOString(),
      opponent: g.opponent,
      league: g.league,
      goalsFor: g.goalsFor ?? 0,
      goalsAgainst: g.goalsAgainst ?? 0,
      result: g.result,
    })),
  });
  } catch (err: any) {
    return handleApiError(err);
  }
}

