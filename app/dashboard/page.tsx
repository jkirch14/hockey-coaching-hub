"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./Dashboard.module.css";

type BootstrapResult =
  | { teamId: string; created: boolean; role: string; teamName: string }
  | { error: string };

type TeamStats = {
  totals: {
    games: number;
    wins: number;
    losses: number;
    ties: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    penalties: number;
    shutouts: number;
  };
  leagues: Array<{ league: string; wins: number; losses: number; ties: number; games: number }>;
};

type PlayerRow = {
  id: string;
  name: string;
  number: number | null;
  totals: { games: number; goals: number; assists: number; points: number; penalties: number; shutouts: number; playerOfGame: number };
};

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "white" }}>
      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700, letterSpacing: 0.2 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
      {sub ? <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>{sub}</div> : null}
    </div>
  );
}

function LineChartGFGA({
  points,
  width = 980,
  height = 220,
}: {
  points: Array<{ xLabel: string; gf: number; ga: number }>;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return <div style={{ padding: 12, opacity: 0.75 }}>Add at least 2 games to see the trend.</div>;
  }

  const pad = 16;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const maxY = Math.max(
    1,
    ...points.flatMap((p) => [p.gf, p.ga])
  );

  const x = (i: number) => pad + (i / (points.length - 1)) * innerW;
  const y = (v: number) => pad + innerH - (v / maxY) * innerH;

  const poly = (vals: number[]) => vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  const gfPts = poly(points.map((p) => p.gf));
  const gaPts = poly(points.map((p) => p.ga));

  // No explicit colors requested; use defaults but still distinguish lines with dash patterns.
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Goals for and against over time">
      {/* border */}
      <rect x="0" y="0" width={width} height={height} fill="white" stroke="#e6e6e6" rx="14" />

      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((t) => {
        const yy = pad + innerH - t * innerH;
        return <line key={t} x1={pad} y1={yy} x2={pad + innerW} y2={yy} stroke="#f0f0f0" />;
      })}

      {/* lines */}
      <polyline points={gfPts} fill="none" stroke="black" strokeWidth="2.5" />
      <polyline points={gaPts} fill="none" stroke="black" strokeWidth="2.5" strokeDasharray="6 6" opacity="0.75" />

      {/* endpoints */}
      {points.map((p: any, i) => (
  <g key={i}>
    <title>
      {`${p.xLabel} vs ${p.opponent}${p.league ? ` | ${p.league}` : ""}\nGF ${p.gf} | GA ${p.ga} | ${p.result}`}
    </title>
    <circle cx={x(i)} cy={y(p.gf)} r="3" fill="black" />
    <circle cx={x(i)} cy={y(p.ga)} r="3" fill="black" opacity="0.75" />
  </g>
))}



      {/* labels */}
      <text x={pad} y={pad - 2} fontSize="12" fill="#555" fontWeight="700">
        GF (solid) vs GA (dashed)
      </text>

      {/* x-axis labels (first, middle, last) */}
      {[
        { i: 0, anchor: "start" as const },
        { i: Math.floor((points.length - 1) / 2), anchor: "middle" as const },
        { i: points.length - 1, anchor: "end" as const },
      ].map(({ i, anchor }) => (
        <text key={i} x={x(i)} y={height - 6} fontSize="11" fill="#777" textAnchor={anchor}>
          {points[i].xLabel}
        </text>
      ))}
    </svg>
  );
}

function CumulativeGDChart({
  points,
  width = 980,
  height = 220,
}: {
  points: Array<{ xLabel: string; gf: number; ga: number }>;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return <div style={{ padding: 12, opacity: 0.75 }}>Add at least 2 games to see the cumulative trend.</div>;
  }

  const pad = 16;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  // build cumulative series
  let running = 0;
  const cum = points.map((p) => {
    running += (p.gf ?? 0) - (p.ga ?? 0);
    return running;
  });

  const minY = Math.min(0, ...cum);
  const maxY = Math.max(0, ...cum);
  const range = Math.max(1, maxY - minY);

  const x = (i: number) => pad + (i / (points.length - 1)) * innerW;
  const y = (v: number) => pad + innerH - ((v - minY) / range) * innerH;

  const pts = cum.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  // zero line
  const y0 = y(0);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cumulative goal differential over season">
      <rect x="0" y="0" width={width} height={height} fill="white" stroke="#e6e6e6" rx="14" />

      {/* zero baseline */}
      <line x1={pad} y1={y0} x2={pad + innerW} y2={y0} stroke="#e6e6e6" strokeWidth="2" />

      {/* line */}
      <polyline points={pts} fill="none" stroke="black" strokeWidth="2.5" />

      {/* points */}
      {cum.map((v, i) => {
        const p: any = points[i];
        const perGame = (p.gf ?? 0) - (p.ga ?? 0);
        return (
          <g key={i}>
            <title>
              {`${p.xLabel} vs ${p.opponent}${p.league ? ` | ${p.league}` : ""}\nGame GD ${perGame} | Cum GD ${v} | ${p.result}`}
            </title>
            <circle cx={x(i)} cy={y(v)} r="3" fill="black" />
          </g>
        );
      })}


      <text x={pad} y={pad - 2} fontSize="12" fill="#555" fontWeight="700">
        Cumulative Goal Differential (running GF - GA)
      </text>

      {/* x labels: first/mid/last */}
      {[
        { i: 0, anchor: "start" as const },
        { i: Math.floor((points.length - 1) / 2), anchor: "middle" as const },
        { i: points.length - 1, anchor: "end" as const },
      ].map(({ i, anchor }) => (
        <text key={i} x={x(i)} y={height - 6} fontSize="11" fill="#777" textAnchor={anchor}>
          {points[i].xLabel}
        </text>
      ))}
    </svg>
  );
}

function WLTChart({
  points,
  width = 980,
  height = 110,
}: {
  points: Array<{ xLabel: string; gf: number; ga: number; result: "WIN" | "LOSS" | "TIE" }>;
  width?: number;
  height?: number;
}) {
  if (points.length < 1) {
    return <div style={{ padding: 12, opacity: 0.75 }}>Add games to see W/L/T timeline.</div>;
  }

  const pad = 16;
  const innerW = width - pad * 2;

  const x = (i: number) => (points.length === 1 ? pad + innerW / 2 : pad + (i / (points.length - 1)) * innerW);

  // y positions for rows
  const yWin = 36;
  const yTie = 58;
  const yLoss = 80;

  const yFor = (r: "WIN" | "LOSS" | "TIE") => (r === "WIN" ? yWin : r === "TIE" ? yTie : yLoss);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Win/Loss/Tie timeline">
      <rect x="0" y="0" width={width} height={height} fill="white" stroke="#e6e6e6" rx="14" />

      {/* labels */}
      <text x={pad} y={22} fontSize="12" fill="#555" fontWeight="700">
        W / L / T timeline (by game date)
      </text>

      <text x={pad} y={yWin + 4} fontSize="11" fill="#777">
        W
      </text>
      <text x={pad} y={yTie + 4} fontSize="11" fill="#777">
        T
      </text>
      <text x={pad} y={yLoss + 4} fontSize="11" fill="#777">
        L
      </text>

      {/* guide lines */}
      {[yWin, yTie, yLoss].map((yy) => (
        <line key={yy} x1={pad} y1={yy} x2={pad + innerW} y2={yy} stroke="#f0f0f0" />
      ))}

      {/* points */}
      {points.map((p, i) => {
        const cx = x(i);
        const cy = yFor(p.result);

        // No bright colors; use shapes + grayscale:
        // WIN: filled circle
        // TIE: filled square (gray)
        // LOSS: open circle
        if (p.result === "WIN") {
          return <circle key={i} cx={cx} cy={cy} r="5" fill="black" />;
        }
        if (p.result === "TIE") {
          return <rect key={i} x={cx - 5} y={cy - 5} width="10" height="10" fill="#777" rx="2" />;
        }
        return <circle key={i} cx={cx} cy={cy} r="5" fill="white" stroke="black" strokeWidth="2" />;
      })}

      {/* x-axis labels: first/mid/last */}
      {[
        { i: 0, anchor: "start" as const },
        { i: Math.floor((points.length - 1) / 2), anchor: "middle" as const },
        { i: points.length - 1, anchor: "end" as const },
      ].map(({ i, anchor }) => (
        <text key={i} x={x(i)} y={height - 10} fontSize="11" fill="#777" textAnchor={anchor}>
          {points[i]?.xLabel ?? ""}
        </text>
      ))}

      {/* legend */}
      <g transform={`translate(${width - pad - 260}, 14)`}>
        <circle cx="10" cy="10" r="5" fill="black" />
        <text x="22" y="14" fontSize="11" fill="#777">
          Win
        </text>

        <rect x="70" y="5" width="10" height="10" fill="#777" rx="2" />
        <text x="86" y="14" fontSize="11" fill="#777">
          Tie
        </text>

        <circle cx="140" cy="10" r="5" fill="white" stroke="black" strokeWidth="2" />
        <text x="152" y="14" fontSize="11" fill="#777">
          Loss
        </text>
      </g>
    </svg>
  );
}


function LeagueBars({
  leagues,
}: {
  leagues: Array<{ league: string; wins: number; losses: number; ties: number; games: number }>;
}) {
  if (!leagues.length) return <div style={{ padding: 12, opacity: 0.75 }}>No league data yet.</div>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {leagues.map((l) => {
        const total = Math.max(1, l.games);
        const wPct = (l.wins / total) * 100;
        const tPct = (l.ties / total) * 100;
        const lPct = (l.losses / total) * 100;

        return (
          <div key={l.league}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <div style={{ fontWeight: 900 }}>{l.league}</div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                {l.wins}-{l.losses}-{l.ties} ({l.games})
              </div>
            </div>

            <div style={{ marginTop: 6, height: 14, borderRadius: 999, overflow: "hidden", border: "1px solid #e6e6e6", background: "#fafafa" }}>
              <div style={{ display: "flex", height: "100%" }}>
                <div style={{ width: `${wPct}%`, background: "#111" }} title={`Wins: ${l.wins}`} />
                <div style={{ width: `${tPct}%`, background: "#777" }} title={`Ties: ${l.ties}`} />
                <div style={{ width: `${lPct}%`, background: "#ddd" }} title={`Losses: ${l.losses}`} />
              </div>
            </div>

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              Wins (dark) | Ties (mid) | Losses (light)
            </div>
          </div>
        );
      })}
    </div>
  );
}


export default function DashboardPage() {
  const [boot, setBoot] = useState<BootstrapResult | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [playerRows, setPlayerRows] = useState<PlayerRow[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [trend, setTrend] = useState<
    Array<{
      xLabel: string;
      gf: number;
      ga: number;
      result: "WIN" | "LOSS" | "TIE";
      opponent: string;
      league: string | null;
    }>
  >([]);



  const teamId = useMemo(() => {
    if (!boot || "error" in boot) return "";
    return boot.teamId;
  }, [boot]);

  useEffect(() => {
    (async () => {
      setMsg("Setting up your team...");
      const res = await fetch("/api/bootstrap", { method: "POST" });
      const json = (await res.json()) as BootstrapResult;
      setBoot(json);

      if (!("error" in json)) {
        localStorage.setItem("teamId", json.teamId);
        setMsg("");
      } else {
        setMsg(`Error: ${json.error}`);
      }
    })();
  }, []);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      setMsg("Loading stats...");
      const [tRes, pRes, trRes] = await Promise.all([
        fetch(`/api/stats/team?teamId=${encodeURIComponent(teamId)}`),
        fetch(`/api/stats/players?teamId=${encodeURIComponent(teamId)}`),
        fetch(`/api/stats/trends?teamId=${encodeURIComponent(teamId)}`),
      ]);

    const trJson = await trRes.json();
    if (!trRes.ok) return setMsg(`Error loading trends: ${trJson.error ?? "UNKNOWN"}`);

    setTrend(
      (trJson.games ?? []).map((g: any) => ({
        xLabel: new Date(g.date).toLocaleDateString(),
        gf: g.goalsFor ?? 0,
        ga: g.goalsAgainst ?? 0,
        result: g.result as "WIN" | "LOSS" | "TIE",
        opponent: g.opponent ?? "",
        league: g.league ?? null,
      }))
    );



      const tJson = await tRes.json();
      const pJson = await pRes.json();

    if (!tRes.ok && tJson.error === "NO_ACCESS") {
      window.location.href = `/no-access?teamId=${encodeURIComponent(teamId)}`;
      return;
    }
    if (!pRes.ok && pJson.error === "NO_ACCESS") {
      window.location.href = `/no-access?teamId=${encodeURIComponent(teamId)}`;
      return;
    }
    if (!trRes.ok && trJson.error === "NO_ACCESS") {
      window.location.href = `/no-access?teamId=${encodeURIComponent(teamId)}`;
      return;
    }



      setTeamStats(tJson);
      setPlayerRows((pJson.players ?? []).slice(0, 10)); // Top 10
      setMsg("");
    })();
  }, [teamId]);

  const record = teamStats ? `${teamStats.totals.wins}-${teamStats.totals.losses}-${teamStats.totals.ties}` : "-";
  const gfga = teamStats ? `${teamStats.totals.goalsFor} / ${teamStats.totals.goalsAgainst}` : "-";
  const gd = teamStats ? `${teamStats.totals.goalDiff}` : "-";

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>
            Dashboard{boot && !("error" in boot) ? ` | ${boot.teamName}` : ""}
          </h1>
          {boot && !("error" in boot) ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              Role: <b>{boot.role}</b> | Team ID: <code>{boot.teamId}</code>
            </div>
          ) : null}
        </div>

        <nav className={styles.localNav}>
          <Link href="/players">Players</Link>
          <Link href="/games">Games</Link>
          <Link href="/stats/players">Player Stats</Link>
          <Link href="/admin/sharing">Sharing</Link>
        </nav>
      </header>

      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}

      <section className={styles.statsGrid}>
        <Card title="Record" value={record} sub={teamStats ? `${teamStats.totals.games} games` : ""} />
        <Card title="Goals For / Against" value={gfga} sub={teamStats ? `GD: ${gd}` : ""} />
        <Card title="Penalties" value={teamStats ? String(teamStats.totals.penalties) : "-"} />
        <Card title="Shutouts" value={teamStats ? String(teamStats.totals.shutouts) : "-"} />
      </section>

      <section className={styles.splitGrid}>
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>League breakdown</h2>

          <div style={{ marginTop: 10, borderTop: "1px solid #eee" }}>
            {(teamStats?.leagues ?? []).map((l) => (
              <div
                key={l.league}
                className={styles.leagueRow}
              >
                <div style={{ fontWeight: 800 }}>{l.league}</div>
                <div style={{ opacity: 0.85 }}>
                  {l.wins}-{l.losses}-{l.ties}
                </div>
                <div style={{ opacity: 0.65, textAlign: "right" }}>{l.games} games</div>
              </div>
            ))}
            {(teamStats?.leagues ?? []).length === 0 ? <div style={{ paddingTop: 10 }}>No games yet.</div> : null}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Top scorers</h2>

          <div style={{ marginTop: 10, borderTop: "1px solid #eee" }}>
            {playerRows.map((p) => (
              <div
                key={p.id}
                className={styles.scorerRow}
              >
                <div style={{ opacity: 0.8 }}>{p.number ?? ""}</div>
                <div style={{ fontWeight: 800 }}>{p.name}</div>
                <div style={{ textAlign: "right" }}>{p.totals.goals}</div>
                <div style={{ textAlign: "right" }}>{p.totals.assists}</div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>{p.totals.points}</div>
              </div>
            ))}
            {playerRows.length === 0 ? <div style={{ paddingTop: 10 }}>No lineup stats yet.</div> : null}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Columns: G / A / PTS (from lineup entries)
          </div>
        </div>
      </section>
      <section className={styles.chartGrid}>
<div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "white" }}>
  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Goals trend</h2>
  <div style={{ marginTop: 10 }}>
    <LineChartGFGA points={trend} />
  </div>

  <div style={{ marginTop: 12 }}>
    <CumulativeGDChart points={trend} />
  </div>


</div>


  <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "white" }}>
    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>League record</h2>
    <div style={{ marginTop: 10 }}>
      <LeagueBars leagues={teamStats?.leagues ?? []} />
    </div>
  </div>
</section>
    <div style={{ marginTop: 12 }}>
  <WLTChart points={trend} />
</div>
    </main>
  );
}

