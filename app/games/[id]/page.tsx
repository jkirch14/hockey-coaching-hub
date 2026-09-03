"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "../Games.module.css";

type Player = { id: string; name: string; number: number | null };

type GameLineupEntry = {
  id: string;
  position: "C" | "LW" | "RW" | "LD" | "RD" | "G" | "OTHER";
  line: number | null;
  goals: number;
  assists: number;
  penalties: number;
  shutout: boolean;
  player: {
    id: string;
    name: string;
    number: number | null;
  };
};

type Game = {
  id: string;
  date: string;
  location: string | null;
  opponent: string;
  league: string | null;
  status: "SCHEDULED" | "FINAL" | "CANCELLED";
  result: "WIN" | "LOSS" | "TIE" | null;
  goalsFor: number;
  goalsAgainst: number;
  jerseyColor: string | null;
  notes: string | null;
  playerOfGameId: string | null;
  lineupEntries: GameLineupEntry[];
};

function LineupSummary({ entries }: { entries: GameLineupEntry[] }) {
  if (!entries.length) {
    return (
      <section className={styles.lineupSummary}>
        <div className={styles.lineupSummaryHeader}>
          <h2>Lineup</h2>
        </div>

        <div className={styles.emptyLineup}>
          No lineup saved for this game yet.
        </div>
      </section>
    );
  }

  const positionOrder: Record<string, number> = {
    LW: 1,
    C: 2,
    RW: 3,
    LD: 1,
    RD: 2,
    G: 1,
    OTHER: 9,
  };

  const forwards = entries.filter((entry) =>
    ["LW", "C", "RW"].includes(entry.position)
  );

  const defense = entries.filter((entry) =>
    ["LD", "RD"].includes(entry.position)
  );

  const goalies = entries.filter((entry) => entry.position === "G");

  const other = entries.filter(
    (entry) =>
      !["LW", "C", "RW", "LD", "RD", "G"].includes(entry.position)
  );

  function lineNumbers(items: GameLineupEntry[]) {
    return Array.from(
      new Set(
        items
          .map((entry) => entry.line)
          .filter((line): line is number => line !== null)
      )
    ).sort((a, b) => a - b);
  }

  function playerChip(entry: GameLineupEntry) {
    return (
      <div key={entry.id} className={styles.lineupPlayer}>
        <div className={styles.lineupPosition}>{entry.position}</div>
        <div className={styles.lineupPlayerName}>
          {entry.player.number !== null ? `#${entry.player.number} ` : ""}
          {entry.player.name}
        </div>
      </div>
    );
  }

  function groupedCards(
    title: string,
    items: GameLineupEntry[],
    groupLabel: string
  ) {
    const numbers = lineNumbers(items);
    const unassigned = items.filter((entry) => entry.line === null);

    if (!items.length) return null;

    return (
      <div className={styles.lineupGroup}>
        <h3 className={styles.lineupGroupTitle}>{title}</h3>

        <div className={styles.lineupCards}>
          {numbers.map((line) => {
            const players = items
              .filter((entry) => entry.line === line)
              .sort(
                (a, b) =>
                  (positionOrder[a.position] ?? 99) -
                  (positionOrder[b.position] ?? 99)
              );

            return (
              <div key={`${title}-${line}`} className={styles.lineupCard}>
                <div className={styles.lineupCardTitle}>
                  {groupLabel} {line}
                </div>

                <div className={styles.lineupPlayers}>
                  {players.map(playerChip)}
                </div>
              </div>
            );
          })}

          {unassigned.length > 0 && (
            <div className={styles.lineupCard}>
              <div className={styles.lineupCardTitle}>Unassigned</div>
              <div className={styles.lineupPlayers}>
                {unassigned
                  .sort(
                    (a, b) =>
                      (positionOrder[a.position] ?? 99) -
                      (positionOrder[b.position] ?? 99)
                  )
                  .map(playerChip)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className={styles.lineupSummary}>
      <div className={styles.lineupSummaryHeader}>
        <h2>Lineup</h2>
        <span>{entries.length} players</span>
      </div>

      {groupedCards("Forwards", forwards, "Line")}
      {groupedCards("Defense", defense, "Pair")}

      {goalies.length > 0 && (
        <div className={styles.lineupGroup}>
          <h3 className={styles.lineupGroupTitle}>Goalie</h3>

          <div className={styles.lineupCard}>
            <div className={styles.lineupPlayers}>
              {goalies.map(playerChip)}
            </div>
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div className={styles.lineupGroup}>
          <h3 className={styles.lineupGroupTitle}>Other</h3>

          <div className={styles.lineupCard}>
            <div className={styles.lineupPlayers}>
              {other.map(playerChip)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GameEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!status || status === "Saving...") return;

    const timer = window.setTimeout(() => {
      setStatus("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [status]);

  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [opponent, setOpponent] = useState("");
  const [league, setLeague] = useState("");
  const [result, setResult] = useState<"" | "WIN" | "LOSS" | "TIE">("");
  const [statusValue, setStatusValue] = useState<"SCHEDULED" | "FINAL" | "CANCELLED">("FINAL");
  const [goalsFor, setGoalsFor] = useState("0");
  const [goalsAgainst, setGoalsAgainst] = useState("0");
  const [playerOfGameId, setPlayerOfGameId] = useState("");
  const [jerseyColor, setJerseyColor] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setTeamId(localStorage.getItem("teamId") ?? "");
  }, []);

  async function loadPlayers(tid: string) {
    const res = await fetch(`/api/players?teamId=${encodeURIComponent(tid)}`);
    const json = await res.json();
    if (res.ok) setPlayers(json);
  }

  async function load() {
    if (!teamId) return setStatus("Missing teamId.");

    const res = await fetch(
      `/api/games/${params.id}?teamId=${encodeURIComponent(teamId)}`
    );

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setGame(json);
    setDate(toLocalInputValue(json.date));
    setLocation(json.location ?? "");
    setOpponent(json.opponent ?? "");
    setLeague(json.league ?? "");
    setResult(json.result ?? "");
    setStatusValue(json.status ?? "FINAL");
    setGoalsFor(String(json.goalsFor ?? 0));
    setGoalsAgainst(String(json.goalsAgainst ?? 0));
    setPlayerOfGameId(json.playerOfGameId ?? "");
    setJerseyColor(json.jerseyColor ?? "");
    setNotes(json.notes ?? "");
    setStatus("");
  }

  useEffect(() => {
    if (!teamId) return;

    loadPlayers(teamId);
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function save() {
    if (statusValue === "FINAL" && !result) {
      setStatus("Error: Select a result for a final game.");
      return;
    }

    setStatus("Saving...");

    const res = await fetch(`/api/games/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        date: new Date(date).toISOString(),
        location: location.trim() || null,
        opponent: opponent.trim(),
        league: league.trim() || null,
        status: statusValue,
        result: statusValue === "FINAL" ? result || null : null,
        goalsFor: Number(goalsFor || "0"),
        goalsAgainst: Number(goalsAgainst || "0"),
        playerOfGameId: playerOfGameId || null,
        jerseyColor: jerseyColor.trim() || null,
        notes: notes.trim() || null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setGame(json);
    setStatus("Game saved.");
  }

  async function remove() {
    if (!confirm("Delete this game and its lineup entries?")) return;

    const res = await fetch(
      `/api/games/${params.id}?teamId=${encodeURIComponent(teamId)}`,
      { method: "DELETE" }
    );

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    router.push("/games");
  }

  if (!game) {
    return <main className={styles.page}>{status || "Loading..."}</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>vs. {game.opponent}</h1>
          <div style={{ marginTop: 4, opacity: .65 }}>
            {new Date(game.date).toLocaleDateString()}
          </div>
        </div>

        <nav className={styles.localNav}>
          <Link href="/games">Games</Link>
          <Link href="/players">Players</Link>
        </nav>
      </header>

      <section className={styles.card}>
        <div className={styles.formGrid3}>
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <input
              className={styles.input}
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Opponent</label>
            <input
              className={styles.input}
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>League</label>
            <input
              className={styles.input}
              value={league}
              onChange={(e) => setLeague(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGrid3}>
          <div className={styles.field}>
            <label className={styles.label}>Location</label>
            <input
              className={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Status</label>
            <select
              className={styles.select}
              value={statusValue}
              onChange={(e) => {
                const next = e.target.value as
                  | "SCHEDULED"
                  | "FINAL"
                  | "CANCELLED";

                setStatusValue(next);

                if (next !== "FINAL") {
                  setResult("");
                }
              }}
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="FINAL">Final</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Result</label>
            <select
              className={styles.select}
              value={result}
              disabled={statusValue !== "FINAL"}
              onChange={(e) =>
                setResult(e.target.value as "" | "WIN" | "LOSS" | "TIE")
              }
            >
              <option value="">Select result</option>
              <option value="WIN">Win</option>
              <option value="LOSS">Loss</option>
              <option value="TIE">Tie</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Jersey</label>
            <input
              className={styles.input}
              value={jerseyColor}
              onChange={(e) => setJerseyColor(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.formGridScore}>
          <div className={styles.field}>
            <label className={styles.label}>Goals For</label>
            <input
              className={styles.input}
              inputMode="numeric"
              value={goalsFor}
              onChange={(e) => setGoalsFor(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Goals Against</label>
            <input
              className={styles.input}
              inputMode="numeric"
              value={goalsAgainst}
              onChange={(e) => setGoalsAgainst(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Player of the Game</label>
            <select
              className={styles.select}
              value={playerOfGameId}
              onChange={(e) => setPlayerOfGameId(e.target.value)}
            >
              <option value="">None</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number ? `${p.number} - ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field} style={{ marginTop: 12 }}>
          <label className={styles.label}>Notes</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <LineupSummary entries={game.lineupEntries ?? []} />

        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={save}
            disabled={status === "Saving..."}
          >
            {status === "Saving..." ? "Saving..." : "Save Game"}
          </button>

          <Link
            className={styles.lineupLink}
            href={`/games/${params.id}/lineup`}
          >
            Edit Lineup →
          </Link>

          <button className={styles.button} onClick={remove}>
            Delete Game
          </button>
        </div>

        {status && (
          <div className={`app-toast ${status.startsWith("Error") ? "app-toast-error" : ""}`}>
            {status}
          </div>
        )}
      </section>
    </main>
  );
}







