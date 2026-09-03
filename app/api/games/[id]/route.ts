export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeamRole } from "@/lib/rbac";

const UpdateGame = z.object({
  teamId: z.string(),
  date: z.string().optional(),
  location: z.string().nullable().optional(),
  opponent: z.string().min(1).optional(),
  league: z.string().nullable().optional(),
  status: z.enum(["SCHEDULED", "FINAL", "CANCELLED"]).optional(),
  result: z.enum(["WIN", "LOSS", "TIE"]).nullable().optional(),
  goalsFor: z.number().int().min(0).optional(),
  goalsAgainst: z.number().int().min(0).optional(),
  playerOfGameId: z.string().nullable().optional(),
  jerseyColor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  await requireTeamRole(teamId, "VIEWER");

  const { id } = await ctx.params;
  const game = await db.game.findFirst({
    where: { id, teamId },
    include: { playerOfGame: true, lineupEntries: { include: { player: true } } },
  });

  if (!game) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(game);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const input = UpdateGame.parse(body);

  await requireTeamRole(input.teamId, "ADMIN");

  const { id } = await ctx.params;

  const updated = await db.game.update({
    where: { id },
    data: {
      date: input.date ? new Date(input.date) : undefined,
      location: input.location === undefined ? undefined : input.location,
      opponent: input.opponent ?? undefined,
      league: input.league === undefined ? undefined : input.league,
      status: input.status ?? undefined,
      result: input.result === undefined ? undefined : input.result,
      goalsFor: input.goalsFor ?? undefined,
      goalsAgainst: input.goalsAgainst ?? undefined,
      playerOfGameId: input.playerOfGameId === undefined ? undefined : input.playerOfGameId,
      jerseyColor: input.jerseyColor === undefined ? undefined : input.jerseyColor,
      notes: input.notes === undefined ? undefined : input.notes,
    },
    include: { playerOfGame: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  await requireTeamRole(teamId, "ADMIN");

  const { id } = await ctx.params;

  // delete lineup entries first (FK safety)
  await db.lineupEntry.deleteMany({ where: { gameId: id, teamId } });
  await db.game.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

