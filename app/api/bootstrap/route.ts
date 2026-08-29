import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const DEFAULT_SEASON = {
  name: "2026-27",
  startDate: new Date("2026-07-01T00:00:00.000Z"),
  endDate: new Date("2027-06-30T23:59:59.999Z"),
};

export async function POST() {
  const session = await auth();

  const uid = (session?.user as any)?.id as string | undefined;

  if (!uid) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // Existing team membership?
  const existingMembership = await db.teamMember.findFirst({
    where: { userId: uid },
    include: {
      team: {
        include: {
          seasons: {
            where: { active: true },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (existingMembership) {
    let season = existingMembership.team.seasons[0];

    // Repair/bootstrap a season if this team exists without one.
    if (!season) {
      season = await db.season.create({
        data: {
          teamId: existingMembership.teamId,
          ...DEFAULT_SEASON,
          active: true,
        },
      });
    }

    return NextResponse.json({
      teamId: existingMembership.teamId,
      seasonId: season.id,
      seasonName: season.name,
      created: false,
      role: existingMembership.role,
      teamName: existingMembership.team.name,
    });
  }

  // Brand-new installation/user:
  // create Team + OWNER membership + active Season atomically.
  const team = await db.team.create({
    data: {
      name: "My Hockey Team",
      ownerId: uid,

      members: {
        create: {
          userId: uid,
          role: "OWNER",
        },
      },

      seasons: {
        create: {
          ...DEFAULT_SEASON,
          active: true,
        },
      },
    },

    include: {
      seasons: true,
    },
  });

  const season = team.seasons[0];

  return NextResponse.json({
    teamId: team.id,
    seasonId: season.id,
    seasonName: season.name,
    created: true,
    role: "OWNER",
    teamName: team.name,
  });
}

export const runtime = "nodejs";