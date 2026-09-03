"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./Games.module.css";

type Player = { id: string; name: string; number: number | null };

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
  playerOfGame?: Player | null;
};

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GamesPage() {
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (
      !status ||
      status.startsWith("Adding") ||
      status.startsWith("Loading") ||
      status.startsWith("Syncing")
    ) return;

    const timer = window.setTimeout(() => {
      setStatus("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [status]);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [date, setDate] = useState(toLocalInputValue(new Date()));
  const [location, setLocation] = useState("");
  const [opponent, setOpponent] = useState("");
  const [league, setLeague] = useState("");
  const [result, setResult] = useState<"WIN" | "LOSS" | "TIE">("WIN");
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

  async function loadGames() {
    if (!teamId) {
      setStatus("Missing teamId. Visit the dashboard first.");
      return;
    }

    setStatus("Loading games...");

    const res = await fetch(`/api/games?teamId=${encodeURIComponent(teamId)}`);
    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setGames(json);
    setStatus("");
  }

  useEffect(() => {
    if (!teamId) return;

    loadPlayers(teamId);
    loadGames();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function syncGameSheet() {
    if (!teamId) {
      setStatus("Error: Missing teamId.");
      return;
    }

    setStatus("Syncing GameSheet...");

    const res = await fetch("/api/integrations/gamesheet/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "GameSheet sync failed"}`);
      return;
    }

    await loadGames();
    setStatus(`GameSheet synced ${json.count ?? 0} games.`);
  }

  async function addGame() {
    setStatus("");

    if (!teamId) return setStatus("Missing teamId.");
    if (!opponent.trim()) return setStatus("Opponent is required.");

    setStatus("Adding game...");

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        date: new Date(date).toISOString(),
        location: location.trim() || undefined,
        opponent: opponent.trim(),
        league: league.trim() || undefined,
        result,
        goalsFor: Number(goalsFor || "0"),
        goalsAgainst: Number(goalsAgainst || "0"),
        playerOfGameId: playerOfGameId || undefined,
        jerseyColor: jerseyColor.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setOpponent("");
    setLocation("");
    setLeague("");
    setGoalsFor("0");
    setGoalsAgainst("0");
    setPlayerOfGameId("");
    setJerseyColor("");
    setNotes("");

    await loadGames();
    setStatus("Game added.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Games</h1>

        <nav className={styles.localNav}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/players">Players</Link>
          <Link href="/admin/sharing">Sharing</Link>
        </nav>
      </header>

      <div style={{ marginBottom: 14 }}>
        <button
          className={styles.primaryButton}
          onClick={syncGameSheet}
          disabled={status === "Syncing GameSheet..."}
        >
          {status === "Syncing GameSheet..."
            ? "Syncing..."
            : "Sync GameSheet"}
        </button>
      </div>

      <details className={styles.card}>
        <summary className={styles.cardTitle}>Add game</summary>

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
            <label className={styles.label}>Result</label>
            <select
              className={styles.select}
              value={result}
              onChange={(e) =>
                setResult(e.target.value as "WIN" | "LOSS" | "TIE")
              }
            >
              <option value="WIN">Win</option>
              <option value="LOSS">Loss</option>
              <option value="TIE">Tie</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Jersey color</label>
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

        <button
          className={styles.primaryButton}
          onClick={addGame}
          disabled={status === "Adding game..."}
        >
          {status === "Adding game..." ? "Adding..." : "Add Game"}
        </button>
      </details>

      {status && (
        <div className={`app-toast ${status.startsWith("Error") ? "app-toast-error" : ""}`}>
          {status}
        </div>
      )}

      <section style={{ marginTop: 18 }}>
        <h2 className={styles.cardTitle}>Game Log ({games.length})</h2>

        <div className={styles.desktopLog}>
          <div
            className={`${styles.desktopRow} ${styles.desktopHeader}`}
          >
            <div>Date</div>
            <div>Opponent</div>
            <div>League</div>
            <div>Result</div>
            <div>Score</div>
            <div />
          </div>

          {games.map((g) => (
            <div
              key={g.id}
              className={`${styles.desktopRow} ${styles.desktopGame}`}
            >
              <div>{new Date(g.date).toLocaleString()}</div>
              <div>{g.opponent}</div>
              <div>{g.league ?? ""}</div>
              <div>{g.status === "FINAL" ? g.result ?? "Final" : g.status}</div>
              <div>
                {g.status === "FINAL"
                  ? `${g.goalsFor}-${g.goalsAgainst}`
                  : "—"}
              </div>
              <div>
                <Link href={`/games/${g.id}`}>Edit</Link>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.mobileLog}>
          {games.map((g) => {
            const d = new Date(g.date);

            return (
              <Link
                key={g.id}
                href={`/games/${g.id}`}
                className={styles.gameCard}
              >
                <div className={styles.gameCardTop}>
                  <div className={styles.gameDate}>
                    <div className={styles.gameMonth}>
                      {d.toLocaleDateString(undefined, { month: "short" })}
                    </div>
                    <div className={styles.gameDay}>
                      {d.getDate()}
                    </div>
                  </div>

                  <div className={styles.gameInfo}>
                    <div className={styles.opponent}>
                      vs. {g.opponent}
                    </div>

                    <div className={styles.gameMeta}>
                      {g.league ?? "No league"} • {g.status === "FINAL" ? g.result ?? "Final" : g.status}
                    </div>
                  </div>

                  <div className={styles.score}>
                    {g.status === "FINAL"
                      ? `${g.goalsFor}-${g.goalsAgainst}`
                      : g.status === "CANCELLED"
                        ? "Cancelled"
                        : "Scheduled"}
                  </div>
                </div>
              </Link>
            );
          })}

          {games.length === 0 && (
            <div className={styles.gameCard}>No games yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}







