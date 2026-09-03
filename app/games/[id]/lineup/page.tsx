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
  "LW", "C", "RW", "LD", "RD", "G", "OTHER"
];

export default function LineupEditorPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const [teamId, setTeamId] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!status || status === "Saving lineup...") return;

    const timer = window.setTimeout(() => {
      setStatus("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [status]);
  const [map, setMap] = useState<Record<string, Entry>>({});

  const includedCount = useMemo(
    () => Object.keys(map).length,
    [map]
  );

  const orderedPlayers = useMemo(() => {
    const positionOrder: Record<Entry["position"], number> = {
      LW: 1,
      C: 2,
      RW: 3,
      LD: 4,
      RD: 5,
      G: 6,
      OTHER: 7,
    };

    return [...players].sort((a, b) => {
      const aEntry = map[a.id];
      const bEntry = map[b.id];

      // Players currently in the lineup come first.
      if (!!aEntry !== !!bEntry) {
        return aEntry ? -1 : 1;
      }

      // Players not currently in the lineup fall back to jersey/name.
      if (!aEntry || !bEntry) {
        const aNumber = a.number ?? 999;
        const bNumber = b.number ?? 999;

        if (aNumber !== bNumber) return aNumber - bNumber;
        return a.name.localeCompare(b.name);
      }

      const aPosition = positionOrder[aEntry.position] ?? 99;
      const bPosition = positionOrder[bEntry.position] ?? 99;

      const aIsForward = ["LW", "C", "RW"].includes(aEntry.position);
      const bIsForward = ["LW", "C", "RW"].includes(bEntry.position);

      const aIsDefense = ["LD", "RD"].includes(aEntry.position);
      const bIsDefense = ["LD", "RD"].includes(bEntry.position);

      const groupOrder = (entry: Entry) => {
        if (["LW", "C", "RW"].includes(entry.position)) return 1;
        if (["LD", "RD"].includes(entry.position)) return 2;
        if (entry.position === "G") return 3;
        return 4;
      };

      const aGroup = groupOrder(aEntry);
      const bGroup = groupOrder(bEntry);

      if (aGroup !== bGroup) return aGroup - bGroup;

      // Within forwards and defense, line/pair number comes first.
      if (
        (aIsForward && bIsForward) ||
        (aIsDefense && bIsDefense)
      ) {
        const aLine = Number.parseInt(aEntry.lineText, 10);
        const bLine = Number.parseInt(bEntry.lineText, 10);

        const safeALine = Number.isFinite(aLine) ? aLine : 999;
        const safeBLine = Number.isFinite(bLine) ? bLine : 999;

        if (safeALine !== safeBLine) {
          return safeALine - safeBLine;
        }
      }

      // Then enforce left -> middle -> right position order.
      if (aPosition !== bPosition) {
        return aPosition - bPosition;
      }

      const aNumber = a.number ?? 999;
      const bNumber = b.number ?? 999;

      if (aNumber !== bNumber) return aNumber - bNumber;

      return a.name.localeCompare(b.name);
    });
  }, [players, map]);

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
        line: (() => {
          if (trimmed === "") return null;
          const parsed = Number.parseInt(trimmed, 10);
          return Number.isFinite(parsed) ? parsed : null;
        })(),
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
        <button
          className={styles.saveButton}
          onClick={save}
          disabled={status === "Saving lineup..."}
        >
          {status === "Saving lineup..." ? "Saving..." : "Save Lineup"}
        </button>

        {status && (
          <div className={`app-toast ${status.startsWith("Error") ? "app-toast-error" : ""}`}>
            {status}
          </div>
        )}
      </div>

      <div className={styles.mobileCards}>
        {orderedPlayers.map(playerCard)}
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

        {orderedPlayers.map((p) => {
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




