import type { Metadata, Viewport } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import TeamSync from "@/app/_components/TeamSync";

export const metadata: Metadata = {
  title: "Hockey Coaching Hub",
  description: "Track games, lineups, coaching observations, and stats",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

function Badge({ text }: { text: string }) {
  return <span className="app-role-badge">{text}</span>;
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="app-nav-link">
      {label}
    </a>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  let memberships: Array<{
    teamId: string;
    role: string;
    team: { name: string };
  }> = [];

  let activeTeamId: string | null = null;
  let activeRole: string | null = null;

  if (isLoggedIn) {
    const uid = (session?.user as any)?.id as string;

    memberships = await db.teamMember.findMany({
      where: { userId: uid },
      select: {
        teamId: true,
        role: true,
        team: { select: { name: true } },
      },
      orderBy: [{ team: { name: "asc" } }],
    });

    const c = await cookies();
    const cookieTeam = c.get("activeTeamId")?.value ?? null;

    const validCookieTeam =
      cookieTeam && memberships.some((m) => m.teamId === cookieTeam);

    activeTeamId = validCookieTeam
      ? cookieTeam
      : memberships[0]?.teamId ?? null;

    activeRole =
      memberships.find((m) => m.teamId === activeTeamId)?.role ?? null;
  }

  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";

  return (
    <html lang="en">
      <body>
        {isLoggedIn && (
          <header className="app-header">
            <div className="app-header-inner">
              <div className="app-header-identity-row">
                <a href="/dashboard" className="app-brand">
                  <span className="app-brand-title">
                    Hockey Coaching Hub
                  </span>
                  <span className="app-brand-user">
                    {userName || userEmail}
                  </span>
                </a>

                {activeRole ? <Badge text={activeRole} /> : null}
              </div>

              {memberships.length > 0 && (
                <form
                  action="/api/active-team"
                  method="post"
                  className="app-team-switcher"
                >
                  <input
                    type="hidden"
                    name="redirectTo"
                    value="/dashboard"
                  />

                  <select
                    name="teamId"
                    defaultValue={activeTeamId ?? ""}
                    aria-label="Active team"
                    className="app-team-select"
                  >
                    {memberships.map((m) => (
                      <option key={m.teamId} value={m.teamId}>
                        {m.team.name}
                      </option>
                    ))}
                  </select>

                  {memberships.length > 1 && (
                    <button
                      type="submit"
                      className="app-switch-button"
                    >
                      Switch
                    </button>
                  )}
                </form>
              )}

              <nav className="app-nav">
                <NavLink href="/dashboard" label="Home" />
                <NavLink href="/players" label="Players" />
                <NavLink href="/games" label="Games" />
                <NavLink href="/stats/players" label="Stats" />
                <NavLink href="/admin/sharing" label="Sharing" />
                <NavLink href="/api/auth/signout" label="Sign out" />
              </nav>
            </div>
          </header>
        )}

        {isLoggedIn ? <TeamSync teamId={activeTeamId} /> : null}

        <div className="app-content">{children}</div>
      </body>
    </html>
  );
}
