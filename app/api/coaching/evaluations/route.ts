import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const seasonId = searchParams.get("seasonId");
    const playerId = searchParams.get("playerId");

    if (!seasonId) {
      return NextResponse.json(
        { error: "seasonId is required" },
        { status: 400 }
      );
    }

    const evaluations = await db.playerEvaluation.findMany({
      where: {
        seasonId,
        ...(playerId ? { playerId } : {}),
      },
      include: {
        player: true,
      },
      orderBy: [
        { coachRank: "asc" },
        { player: { name: "asc" } },
      ],
    });

    return NextResponse.json(evaluations);
  } catch (error) {
    console.error("GET /api/coaching/evaluations error:", error);

    return NextResponse.json(
      { error: "Failed to load evaluations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      seasonId,
      playerId,
      coachRank,
      primaryPosition,
      secondaryPositions,
      playerType,
      confidence,
      skating,
      speed,
      puckControl,
      passing,
      shooting,
      hockeyIQ,
      compete,
      defensiveAbility,
      positioning,
      teamPlay,
      strengths,
      developmentPriorities,
      coachNotes,
    } = body;

    if (!seasonId || !playerId) {
      return NextResponse.json(
        { error: "seasonId and playerId are required" },
        { status: 400 }
      );
    }

    const evaluation = await db.playerEvaluation.upsert({
      where: {
        seasonId_playerId: {
          seasonId,
          playerId,
        },
      },
      update: {
        coachRank: coachRank ?? null,
        primaryPosition: primaryPosition ?? null,
        secondaryPositions: secondaryPositions ?? [],
        playerType: playerType ?? null,
        confidence: confidence ?? "LOW",

        skating: skating ?? null,
        speed: speed ?? null,
        puckControl: puckControl ?? null,
        passing: passing ?? null,
        shooting: shooting ?? null,
        hockeyIQ: hockeyIQ ?? null,
        compete: compete ?? null,
        defensiveAbility: defensiveAbility ?? null,
        positioning: positioning ?? null,
        teamPlay: teamPlay ?? null,

        strengths: strengths ?? null,
        developmentPriorities: developmentPriorities ?? null,
        coachNotes: coachNotes ?? null,
      },
      create: {
        seasonId,
        playerId,

        coachRank: coachRank ?? null,
        primaryPosition: primaryPosition ?? null,
        secondaryPositions: secondaryPositions ?? [],
        playerType: playerType ?? null,
        confidence: confidence ?? "LOW",

        skating: skating ?? null,
        speed: speed ?? null,
        puckControl: puckControl ?? null,
        passing: passing ?? null,
        shooting: shooting ?? null,
        hockeyIQ: hockeyIQ ?? null,
        compete: compete ?? null,
        defensiveAbility: defensiveAbility ?? null,
        positioning: positioning ?? null,
        teamPlay: teamPlay ?? null,

        strengths: strengths ?? null,
        developmentPriorities: developmentPriorities ?? null,
        coachNotes: coachNotes ?? null,
      },
      include: {
        player: true,
      },
    });

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("POST /api/coaching/evaluations error:", error);

    return NextResponse.json(
      { error: "Failed to save evaluation" },
      { status: 500 }
    );
  }
}