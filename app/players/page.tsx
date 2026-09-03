"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./PlayersPage.module.css";

type Player = {
  id: string;
  name: string;
  number: number | null;
  shootSide: "LEFT" | "RIGHT" | null;
  parentsName: string | null;
};

export default function PlayersPage() {
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState("");

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [shootSide, setShootSide] =
    useState<"" | "LEFT" | "RIGHT">("");
  const [parentsName, setParentsName] = useState("");

  useEffect(() => {
    setTeamId(localStorage.getItem("teamId") ?? "");
  }, []);

  async function load() {
    if (!teamId) {
      setStatus("Missing teamId. Visit the dashboard first.");
      return;
    }

    setStatus("Loading players...");

    const res = await fetch(
      `/api/players?teamId=${encodeURIComponent(teamId)}`
    );

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setPlayers(json);
    setStatus("");
  }

  useEffect(() => {
    if (teamId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function addPlayer() {
    setStatus("");

    if (!teamId) {
      setStatus("Missing teamId. Visit the dashboard first.");
      return;
    }

    if (!name.trim()) {
      setStatus("Name is required.");
      return;
    }

    const payload: {
      teamId: string;
      name: string;
      parentsName?: string;
      shootSide?: "LEFT" | "RIGHT";
      number?: number;
    } = {
      teamId,
      name: name.trim(),
    };

    if (parentsName.trim()) {
      payload.parentsName = parentsName.trim();
    }

    if (shootSide) {
      payload.shootSide = shootSide;
    }

    if (number.trim()) {
      payload.number = Number(number);
    }

    setStatus("Adding player...");

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setName("");
    setNumber("");
    setShootSide("");
    setParentsName("");

    await load();
    setStatus("Player added.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Players</h1>

        <nav className={styles.localNav}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/admin/sharing">Sharing</Link>
        </nav>
      </header>

      <details className={styles.card}>
        <summary className={styles.cardTitle}>Add player</summary>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Number</label>
            <input
              className={styles.input}
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="12"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Shoot side</label>
            <select
              className={styles.select}
              value={shootSide}
              onChange={(e) =>
                setShootSide(
                  e.target.value as "" | "LEFT" | "RIGHT"
                )
              }
            >
              <option value="">Not set</option>
              <option value="LEFT">Left</option>
              <option value="RIGHT">Right</option>
            </select>
          </div>
        </div>

        <div className={`${styles.field} ${styles.parents}`}>
          <label className={styles.label}>Parents names</label>
          <input
            className={styles.input}
            value={parentsName}
            onChange={(e) => setParentsName(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <button className={styles.addButton} onClick={addPlayer}>
          Add Player
        </button>
      </details>

      {status && <p className={styles.status}>{status}</p>}

      <section className={styles.rosterSection}>
        <h2 className={styles.rosterTitle}>
          Roster ({players.length})
        </h2>

        <div className={styles.desktopRoster}>
          <div
            className={`${styles.desktopRow} ${styles.desktopHeader}`}
          >
            <div>#</div>
            <div>Name</div>
            <div>Shoots</div>
            <div>Parents</div>
            <div />
          </div>

          {players.map((p) => (
            <div
              key={p.id}
              className={`${styles.desktopRow} ${styles.desktopPlayer}`}
            >
              <div>{p.number ?? ""}</div>
              <div>{p.name}</div>
              <div>{p.shootSide ?? ""}</div>
              <div>{p.parentsName ?? ""}</div>
              <div>
                <Link href={`/players/${p.id}`}>
                  Coaching
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.mobileRoster}>
          {players.map((p) => (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className={styles.playerCard}
            >
              <div className={styles.playerCardTop}>
                <div className={styles.number}>
                  {p.number ?? "—"}
                </div>

                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>
                    {p.name}
                  </div>

                  <div className={styles.playerMeta}>
                    {p.shootSide
                      ? `Shoots ${p.shootSide.toLowerCase()}`
                      : "Open coaching profile"}
                  </div>
                </div>

                <div className={styles.chevron}>›</div>
              </div>
            </Link>
          ))}

          {players.length === 0 && (
            <div className={styles.playerCard}>
              No players yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
