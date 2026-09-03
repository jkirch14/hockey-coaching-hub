"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./Lineup.module.css";

type Player = { id: string; name: string; number: number | null };
type Game = { id: string; date: string; opponent: string; league: string | null };

type Entry = {
  playerId: string;
  position: "C" | "LW" | "RW" | "LD" | "RD" | "G" | "OTHER";
  lineText: string;
  goals: number;
  assists: number;
  penalties: number;
  shutout: boolean;
};

const POSITIONS: Entry["position"][] = [
  "C", "LW", "RW", "LD", "RD", "G", "OTHER"
];

export default function LineupEditorPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const [teamId, setTeamId] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState("");
  const [map, setMap] = useState<Record<string, Entry>>({});

  const includedCount = useMemo(
    () => Object.keys(map).length,
    [map]
  );

  useEffect(() => {
    setTeamId(localStorage.getItem("teamId") ?? "");
  }, []);

  async function load() {
    if (!teamId) return;

    const res = await fetch(
      `/api/lineups?teamId=${encodeURIComponent(teamId)}&gameId=${encodeURIComponent(gameId)}`
    );

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setGame(json.game);
    setPlayers(json.players);

    const next: Record<string, Entry> = {};

    for (const e of json.entries) {
      next[e.playerId] = {
        playerId: e.playerId,
        position: e.position,
        lineText:
          e.line === null || e.line === undefined
            ? ""
            : String(e.line),
        goals: e.goals ?? 0,
        assists: e.assists ?? 0,
        penalties: e.penalties ?? 0,
        shutout: !!e.shutout,
      };
    }

    setMap(next);
    setStatus("");
  }

  useEffect(() => {
    if (teamId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  function togglePlayer(playerId: string) {
    setMap((prev) => {
      const copy = { ...prev };

      if (copy[playerId]) {
        delete copy[playerId];
      } else {
        copy[playerId] = {
          playerId,
          position: "OTHER",
          lineText: "",
          goals: 0,
          assists: 0,
          penalties: 0,
          shutout: false,
        };
      }

      return copy;
    });
  }

  function update(playerId: string, patch: Partial<Entry>) {
    setMap((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        ...patch,
      },
    }));
  }

  async function save() {
    setStatus("Saving lineup...");

    const entries = Object.values(map).map((e) => {
      const trimmed = e.lineText.trim();

      return {
        playerId: e.playerId,
        position: e.position,
        line:
          trimmed === ""
            ? null
            : Number.parseInt(trimmed, 10),
        goals: e.goals,
        assists: e.assists,
        penalties: e.penalties,
        shutout: e.position === "G" ? e.shutout : false,
      };
    });

    const res = await fetch("/api/lineups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        gameId,
        entries,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    await load();
    setStatus(`Saved lineup (${entries.length} players).`);
  }

  function playerCard(p: Player) {
    const e = map[p.id];
    const included = !!e;

    return (
      <div className={styles.playerCard} key={p.id}>
        <div className={styles.playerTop}>
          <input
            type="checkbox"
            checked={included}
            onChange={() => togglePlayer(p.id)}
          />

          <div className={styles.playerName}>
            {p.name}
          </div>

          <div className={styles.number}>
            #{p.number ?? "—"}
          </div>
        </div>

        {included && (
          <>
            <div className={styles.cardGrid}>
              <div className={styles.field}>
                <label>Position</label>
                <select
                  className={styles.control}
                  value={e.position}
                  onChange={(ev) =>
                    update(p.id, {
                      position: ev.target.value as Entry["position"],
                    })
                  }
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Line</label>
                <input
                  className={styles.control}
                  inputMode="numeric"
                  value={e.lineText}
                  onChange={(ev) =>
                    update(p.id, { lineText: ev.target.value })
                  }
                />
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.field}>
                <label>G</label>
                <input
                  className={styles.control}
                  inputMode="numeric"
                  value={e.goals}
                  onChange={(ev) =>
                    update(p.id, {
                      goals: Number(ev.target.value || "0"),
                    })
                  }
                />
              </div>

              <div className={styles.field}>
                <label>A</label>
                <input
                  className={styles.control}
                  inputMode="numeric"
                  value={e.assists}
                  onChange={(ev) =>
                    update(p.id, {
                      assists: Number(ev.target.value || "0"),
                    })
                  }
                />
              </div>

              <div className={styles.field}>
                <label>PIM</label>
                <input
                  className={styles.control}
                  inputMode="numeric"
                  value={e.penalties}
                  onChange={(ev) =>
                    update(p.id, {
                      penalties: Number(ev.target.value || "0"),
                    })
                  }
                />
              </div>

              <div className={styles.field}>
                <label>SO</label>
                <input
                  type="checkbox"
                  disabled={e.position !== "G"}
                  checked={e.position === "G" && e.shutout}
                  onChange={(ev) =>
                    update(p.id, {
                      shutout: ev.target.checked,
                    })
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lineup</h1>

        <nav className={styles.nav}>
          <Link href="/games">Games</Link>
          <Link href={`/games/${gameId}`}>Game</Link>
          <Link href="/players">Players</Link>
        </nav>
      </header>

      {game && (
        <div className={styles.summary}>
          <b>vs. {game.opponent}</b>
          <br />
          {new Date(game.date).toLocaleString()}
          {game.league ? ` • ${game.league}` : ""}
          <br />
          Included: <b>{includedCount}</b>
        </div>
      )}

      <div className={styles.saveBar}>
        <button className={styles.saveButton} onClick={save}>
          Save Lineup
        </button>
        {status && <span>{status}</span>}
      </div>

      <div className={styles.mobileCards}>
        {players.map(playerCard)}
      </div>

      <div className={styles.desktopTable}>
        <div
          className={`${styles.desktopRow} ${styles.desktopHeader}`}
        >
          <div>In</div>
          <div>#</div>
          <div>Name</div>
          <div>Pos</div>
          <div>Line</div>
          <div>G</div>
          <div>A</div>
          <div>PIM</div>
          <div>SO</div>
        </div>

        {players.map((p) => {
          const e = map[p.id];
          const included = !!e;

          return (
            <div
              key={p.id}
              className={`${styles.desktopRow} ${styles.desktopPlayer}`}
            >
              <input
                type="checkbox"
                checked={included}
                onChange={() => togglePlayer(p.id)}
              />

              <div>{p.number ?? ""}</div>
              <div>{p.name}</div>

              <select
                className={styles.control}
                disabled={!included}
                value={e?.position ?? "OTHER"}
                onChange={(ev) =>
                  update(p.id, {
                    position: ev.target.value as Entry["position"],
                  })
                }
              >
                {POSITIONS.map((pos) => (
                  <option key={pos}>{pos}</option>
                ))}
              </select>

              <input
                className={styles.control}
                disabled={!included}
                inputMode="numeric"
                value={e?.lineText ?? ""}
                onChange={(ev) =>
                  update(p.id, { lineText: ev.target.value })
                }
              />

              <input
                className={styles.control}
                disabled={!included}
                value={e?.goals ?? 0}
                onChange={(ev) =>
                  update(p.id, {
                    goals: Number(ev.target.value || "0"),
                  })
                }
              />

              <input
                className={styles.control}
                disabled={!included}
                value={e?.assists ?? 0}
                onChange={(ev) =>
                  update(p.id, {
                    assists: Number(ev.target.value || "0"),
                  })
                }
              />

              <input
                className={styles.control}
                disabled={!included}
                value={e?.penalties ?? 0}
                onChange={(ev) =>
                  update(p.id, {
                    penalties: Number(ev.target.value || "0"),
                  })
                }
              />

              <input
                type="checkbox"
                disabled={!included || e?.position !== "G"}
                checked={
                  included && e?.position === "G"
                    ? e.shutout
                    : false
                }
                onChange={(ev) =>
                  update(p.id, {
                    shutout: ev.target.checked,
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
