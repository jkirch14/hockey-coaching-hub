export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTeamRole } from "@/lib/rbac";
import {
  GAMESHEET_SOURCE,
  MANCHESTER_GSL_PARITY_GAMES,
} from "@/lib/gamesheet";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const teamId = String(body.teamId ?? "");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId required" },
        { status: 400 }
      );
    }

    await requireTeamRole(teamId, "ADMIN");

    const season = await db.season.findFirst({
      where: {
        teamId,
        active: true,
      },
    });

    if (!season) {
      return NextResponse.json(
        { error: "No active season found for team." },
        { status: 400 }
      );
    }

    const synced = [];

    for (const external of MANCHESTER_GSL_PARITY_GAMES) {
      const game = await db.game.upsert({
        where: {
          teamId_externalSource_externalGameId: {
            teamId,
            externalSource: GAMESHEET_SOURCE,
            externalGameId: external.gameId,
          },
        },
        create: {
          teamId,
          seasonId: season.id,
          date: new Date(external.date),
          location: external.location,
          opponent: external.opponent,
          league: external.league,
          status: "SCHEDULED",
          result: null,
          goalsFor: 0,
          goalsAgainst: 0,
          externalSource: GAMESHEET_SOURCE,
          externalGameId: external.gameId,
          externalTeamId: external.teamId,
          externalSeasonId: external.seasonId,
          externalDivisionId: external.divisionId,
        },
        update: {
          seasonId: season.id,
          date: new Date(external.date),
          location: external.location,
          opponent: external.opponent,
          league: external.league,
          externalTeamId: external.teamId,
          externalSeasonId: external.seasonId,
          externalDivisionId: external.divisionId,
        },
      });

      synced.push({
        id: game.id,
        externalGameId: game.externalGameId,
        opponent: game.opponent,
        date: game.date,
        status: game.status,
      });
    }

    return NextResponse.json({
      ok: true,
      season: season.name,
      count: synced.length,
      games: synced,
    });
  } catch (error) {
    console.error("GameSheet sync failed", error);

    return NextResponse.json(
      { error: "GameSheet sync failed." },
      { status: 500 }
    );
  }
}
