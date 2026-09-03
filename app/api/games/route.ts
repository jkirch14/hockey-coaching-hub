export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeamRole } from "@/lib/rbac";

const CreateGame = z.object({
  teamId: z.string(),
  date: z.string().min(1), // ISO string from client
  location: z.string().optional(),
  opponent: z.string().min(1),
  league: z.string().optional(),
  status: z.enum(["SCHEDULED", "FINAL", "CANCELLED"]).default("FINAL"),
  result: z.enum(["WIN", "LOSS", "TIE"]).nullable().optional(),
  goalsFor: z.number().int().min(0).default(0),
  goalsAgainst: z.number().int().min(0).default(0),
  playerOfGameId: z.string().optional(),
  jerseyColor: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  await requireTeamRole(teamId, "VIEWER");

  const games = await db.game.findMany({
    where: { teamId },
    orderBy: [{ date: "desc" }],
    include: { playerOfGame: true },
  });

  return NextResponse.json(games);
}

export async function POST(req: Request) {
  const body = await req.json();
  const input = CreateGame.parse(body);

  await requireTeamRole(input.teamId, "ADMIN");

  const game = await db.game.create({
    data: {
      teamId: input.teamId,
      date: new Date(input.date),
      location: input.location || null,
      opponent: input.opponent,
      league: input.league || null,
      status: input.status,
      result: input.result ?? null,
      goalsFor: input.goalsFor ?? 0,
      goalsAgainst: input.goalsAgainst ?? 0,
      playerOfGameId: input.playerOfGameId || null,
      jerseyColor: input.jerseyColor || null,
      notes: input.notes || null,
    },
    include: { playerOfGame: true },
  });

  return NextResponse.json(game);
}

