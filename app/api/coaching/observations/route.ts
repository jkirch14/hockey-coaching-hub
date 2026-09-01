import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const teamId = searchParams.get("teamId");
    const playerId = searchParams.get("playerId");
    const seasonId = searchParams.get("seasonId");
    const gameId = searchParams.get("gameId");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const observations = await db.coachObservation.findMany({
      where: {
        teamId,
        ...(playerId ? { playerId } : {}),
        ...(seasonId ? { seasonId } : {}),
        ...(gameId ? { gameId } : {}),
      },
      include: {
        player: true,
        game: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(observations);
  } catch (error) {
    console.error("GET /api/coaching/observations error:", error);

    return NextResponse.json(
      { error: "Failed to load observations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      teamId,
      seasonId,
      playerId,
      gameId,
      source,
      category,
      note,
      date,
    } = body;

    if (!teamId || !playerId || !source || !category || !note) {
      return NextResponse.json(
        {
          error:
            "teamId, playerId, source, category, and note are required",
        },
        { status: 400 }
      );
    }

    const observation = await db.coachObservation.create({
      data: {
        teamId,
        seasonId: seasonId ?? null,
        playerId,
        gameId: gameId ?? null,
        source,
        category,
        note,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        player: true,
        game: true,
      },
    });

    return NextResponse.json(observation, { status: 201 });
  } catch (error) {
    console.error("POST /api/coaching/observations error:", error);

    return NextResponse.json(
      { error: "Failed to create observation" },
      { status: 500 }
    );
  }
}