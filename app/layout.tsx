import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import TeamSync from "@/app/_components/TeamSync";

export const metadata: Metadata = {
  title: "Hockey Coaching Hub",
  description: "Track games, lineups, and stats",
};

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 900,
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid #e6e6e6",
        background: "white",
      }}
    >
      {text}
    </span>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        fontWeight: 800,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #e6e6e6",
        background: "white",
      }}
    >
      {label}
    </a>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  let memberships: Array<{ teamId: string; role: string; team: { name: string } }> = [];
  let activeTeamId: string | null = null;
  let activeRole: string | null = null;

  if (isLoggedIn) {
    const uid = (session?.user as any)?.id as string;

    memberships = await db.teamMember.findMany({
      where: { userId: uid },
      select: { teamId: true, role: true, team: { select: { name: true } } },
      orderBy: [{ team: { name: "asc" } }],
    });

    const c = await cookies();
    const cookieTeam = c.get("activeTeamId")?.value ?? null;

    // choose active team: cookie (if valid) else first membership
    const validCookieTeam = cookieTeam && memberships.some((m) => m.teamId === cookieTeam);
    activeTeamId = validCookieTeam ? cookieTeam : memberships[0]?.teamId ?? null;
    activeRole = memberships.find((m) => m.teamId === activeTeamId)?.role ?? null;
  }

  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa" }}>
        {isLoggedIn && (
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              background: "rgba(250,250,250,0.9)",
              backdropFilter: "blur(6px)",
              borderBottom: "1px solid #eee",
            }}
          >
            <div
              style={{
                maxWidth: 1200,
                margin: "0 auto",
                padding: "12px 16px",
                display: "flex",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260 }}>
                <a href="/dashboard" style={{ textDecoration: "none", color: "black" }}>
                  <div style={{ fontWeight: 950 }}>Hockey Coaching Hub</div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
                    {userName || userEmail}
                  </div>
                </a>
                {activeRole ? <Badge text={activeRole} /> : null}
              </div>

              {/* Team switcher */}
              <form action="/api/active-team" method="post" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="hidden" name="redirectTo" value="/dashboard" />
                <select
                  name="teamId"
                  defaultValue={activeTeamId ?? ""}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e6e6e6", fontWeight: 800 }}
                >
                  {memberships.map((m) => (
                    <option key={m.teamId} value={m.teamId}>
                      {m.team.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #e6e6e6",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Switch
                </button>
              </form>

              <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <NavLink href="/dashboard" label="Dashboard" />
                <NavLink href="/players" label="Players" />
                <NavLink href="/games" label="Games" />
                <NavLink href="/stats/players" label="Player Stats" />
                <NavLink href="/stats/team" label="Team Stats" />
                <NavLink href="/admin/sharing" label="Sharing" />
                <NavLink href="/api/auth/signout" label="Sign out" />
              </nav>
            </div>
          </header>
        )}

        {/* Sync activeTeamId into localStorage so existing pages continue to work */}
        {isLoggedIn ? <TeamSync teamId={activeTeamId} /> : null}

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px" }}>{children}</div>
      </body>
    </html>
  );
}
