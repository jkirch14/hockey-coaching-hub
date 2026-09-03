export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireTeamRole } from "@/lib/rbac";

const UpdatePlayer = z.object({
  teamId: z.string(),
  name: z.string().min(1).optional(),
  number: z.number().int().nullable().optional(),
  shootSide: z.enum(["LEFT", "RIGHT"]).nullable().optional(),
  parentsName: z.string().nullable().optional(),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId required" },
      { status: 400 }
    );
  }

  await requireTeamRole(teamId, "VIEWER");

  const { id } = await ctx.params;

  const player = await db.player.findFirst({
    where: {
      id,
      teamId,
    },
  });

  if (!player) {
    return NextResponse.json(
      { error: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const activeSeason = await db.season.findFirst({
    where: {
      teamId,
      active: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  const evaluation = activeSeason
    ? await db.playerEvaluation.findUnique({
        where: {
          seasonId_playerId: {
            seasonId: activeSeason.id,
            playerId: player.id,
          },
        },
      })
    : null;

  const observations = await db.coachObservation.findMany({
    where: {
      teamId,
      playerId: player.id,
      ...(activeSeason
        ? {
            OR: [
              { seasonId: activeSeason.id },
              { seasonId: null },
            ],
          }
        : {}),
    },
    include: {
      game: {
        select: {
          id: true,
          date: true,
          opponent: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
    take: 50,
  });

  return NextResponse.json({
    ...player,
    activeSeason,
    evaluation,
    observations,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const input = UpdatePlayer.parse(body);

  await requireTeamRole(input.teamId, "ADMIN");

  const { id } = await ctx.params;

  const updated = await db.player.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      number: input.number === undefined ? undefined : input.number,
      shootSide:
        input.shootSide === undefined ? undefined : input.shootSide,
      parentsName:
        input.parentsName === undefined ? undefined : input.parentsName,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId required" },
      { status: 400 }
    );
  }

  await requireTeamRole(teamId, "ADMIN");

  const { id } = await ctx.params;

  const count = await db.lineupEntry.count({
    where: {
      playerId: id,
      teamId,
    },
  });

  if (count > 0) {
    return NextResponse.json(
      { error: "PLAYER_IN_USE" },
      { status: 409 }
    );
  }

  await db.player.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
