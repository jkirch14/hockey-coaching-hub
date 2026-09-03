"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./PlayerCoaching.module.css";

type Position = "C" | "LW" | "RW" | "LD" | "RD" | "G" | "OTHER";
type Confidence = "LOW" | "MEDIUM" | "HIGH";

type Season = {
  id: string;
  name: string;
};

type Evaluation = {
  id: string;
  coachRank: number | null;
  primaryPosition: Position | null;
  secondaryPositions: Position[];
  playerType: string | null;
  confidence: Confidence;
  skating: number | null;
  speed: number | null;
  puckControl: number | null;
  passing: number | null;
  shooting: number | null;
  hockeyIQ: number | null;
  compete: number | null;
  defensiveAbility: number | null;
  positioning: number | null;
  teamPlay: number | null;
  strengths: string | null;
  developmentPriorities: string | null;
  coachNotes: string | null;
};

type Observation = {
  id: string;
  date: string;
  source: string;
  category: string;
  note: string;
  game: {
    id: string;
    date: string;
    opponent: string;
  } | null;
};

type Player = {
  id: string;
  name: string;
  number: number | null;
  shootSide: "LEFT" | "RIGHT" | null;
  parentsName: string | null;
  activeSeason: Season | null;
  evaluation: Evaluation | null;
  observations: Observation[];
};

const POSITIONS: Position[] = ["C", "LW", "RW", "LD", "RD", "G", "OTHER"];

const RATINGS = [
  ["skating", "Skating"],
  ["speed", "Speed / Acceleration"],
  ["puckControl", "Puck Control"],
  ["passing", "Passing"],
  ["shooting", "Shooting"],
  ["hockeyIQ", "Hockey IQ"],
  ["compete", "Compete / Battle"],
  ["defensiveAbility", "Defensive Ability"],
  ["positioning", "Positioning"],
  ["teamPlay", "Team Play"],
] as const;

const OBSERVATION_CATEGORIES = [
  "SKATING",
  "SPEED",
  "PUCK_CONTROL",
  "PASSING",
  "SHOOTING",
  "HOCKEY_IQ",
  "COMPETE",
  "DEFENSE",
  "POSITIONING",
  "TEAM_PLAY",
  "LEADERSHIP",
  "GOALTENDING",
  "CHEMISTRY",
  "OTHER",
];

function emptyEvaluation(): Omit<Evaluation, "id"> {
  return {
    coachRank: null,
    primaryPosition: null,
    secondaryPositions: [],
    playerType: null,
    confidence: "LOW",
    skating: null,
    speed: null,
    puckControl: null,
    passing: null,
    shooting: null,
    hockeyIQ: null,
    compete: null,
    defensiveAbility: null,
    positioning: null,
    teamPlay: null,
    strengths: null,
    developmentPriorities: null,
    coachNotes: null,
  };
}

export default function PlayerCoachingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [teamId, setTeamId] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState("");

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [shootSide, setShootSide] = useState<"" | "LEFT" | "RIGHT">("");
  const [parentsName, setParentsName] = useState("");

  const [evaluation, setEvaluation] =
    useState<Omit<Evaluation, "id">>(emptyEvaluation());

  const [observationSource, setObservationSource] = useState("GENERAL");
  const [observationCategory, setObservationCategory] =
    useState("POSITIONING");
  const [observationNote, setObservationNote] = useState("");

  useEffect(() => {
    setTeamId(localStorage.getItem("teamId") ?? "");
  }, []);

  async function load() {
    if (!teamId) {
      setStatus("Missing teamId. Visit /dashboard first.");
      return;
    }

    setStatus("Loading...");

    const res = await fetch(
      `/api/players/${params.id}?teamId=${encodeURIComponent(teamId)}`
    );

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setPlayer(json);
    setName(json.name ?? "");
    setNumber(json.number?.toString() ?? "");
    setShootSide(json.shootSide ?? "");
    setParentsName(json.parentsName ?? "");

    if (json.evaluation) {
      const { id: _id, ...evaluationData } = json.evaluation;
      setEvaluation(evaluationData);
    } else {
      setEvaluation(emptyEvaluation());
    }

    setStatus("");
  }

  useEffect(() => {
    if (teamId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  function updateEvaluationField(
    field: keyof Omit<Evaluation, "id">,
    value: unknown
  ) {
    setEvaluation((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleSecondaryPosition(position: Position) {
    setEvaluation((current) => {
      const exists = current.secondaryPositions.includes(position);

      return {
        ...current,
        secondaryPositions: exists
          ? current.secondaryPositions.filter((p) => p !== position)
          : [...current.secondaryPositions, position],
      };
    });
  }

  async function saveEvaluation() {
    if (!player?.activeSeason) {
      setStatus("No active season exists for this team.");
      return;
    }

    setStatus("Saving evaluation...");

    const res = await fetch("/api/coaching/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        seasonId: player.activeSeason.id,
        playerId: player.id,
        ...evaluation,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    await load();
    setStatus("Evaluation saved.");
  }

  async function addObservation() {
    if (!observationNote.trim()) {
      setStatus("Observation note is required.");
      return;
    }

    setStatus("Saving observation...");

    const res = await fetch("/api/coaching/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        seasonId: player?.activeSeason?.id ?? null,
        playerId: params.id,
        source: observationSource,
        category: observationCategory,
        note: observationNote.trim(),
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    setObservationNote("");
    await load();
    setStatus("Observation saved.");
  }

  async function savePlayerDetails() {
    if (!teamId) return setStatus("Missing teamId.");
    if (!name.trim()) return setStatus("Name is required.");

    setStatus("Saving player details...");

    const res = await fetch(`/api/players/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        name: name.trim(),
        number: number.trim() ? Number(number) : null,
        shootSide: shootSide || null,
        parentsName: parentsName.trim() || null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    await load();
    setStatus("Player details saved.");
  }

  async function removePlayer() {
    if (!teamId) return setStatus("Missing teamId.");
    if (!confirm("Delete this player?")) return;

    const res = await fetch(
      `/api/players/${params.id}?teamId=${encodeURIComponent(teamId)}`,
      { method: "DELETE" }
    );

    const json = await res.json();

    if (!res.ok) {
      setStatus(`Error: ${json.error ?? "UNKNOWN"}`);
      return;
    }

    router.push("/players");
  }

  if (!player) {
    return <main className={styles.page}>{status || "Loading..."}</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.playerName}>
              {player.number !== null ? `#${player.number} ` : ""}
              {player.name}
            </h1>

            <div className={styles.summary}>
              <span className={styles.badge}>
                {evaluation.primaryPosition ?? "Position not set"}
              </span>

              {evaluation.coachRank && (
                <span className={styles.badge}>
                  Rank #{evaluation.coachRank}
                </span>
              )}

              {player.activeSeason && (
                <span className={styles.badge}>
                  {player.activeSeason.name}
                </span>
              )}
            </div>
          </div>

          <nav className={styles.nav}>
            <Link href="/players">Roster</Link>
            <Link href={`/players/${player.id}/stats`}>Stats</Link>
            <Link href="/dashboard">Home</Link>
          </nav>
        </div>
      </header>

      {status && (
        <div className={`app-toast ${status.startsWith("Error") ? "app-toast-error" : ""}`}>
          {status}
        </div>
      )}

      <section className={styles.primaryCard}>
        <h2 className={styles.sectionTitle}>Quick Observation</h2>

        <p className={styles.help}>
          Use your phone microphone in the note field to dictate quickly.
        </p>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className={styles.label}>Source</label>
            <select
              className={styles.select}
              value={observationSource}
              onChange={(e) => setObservationSource(e.target.value)}
            >
              <option value="GAME">Game</option>
              <option value="PRACTICE">Practice</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select
              className={styles.select}
              value={observationCategory}
              onChange={(e) => setObservationCategory(e.target.value)}
            >
              {OBSERVATION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field} style={{ marginTop: 12 }}>
          <label className={styles.label}>Observation</label>
          <textarea
            className={`${styles.textarea} ${styles.observationTextarea}`}
            value={observationNote}
            onChange={(e) => setObservationNote(e.target.value)}
            placeholder="What did you see?"
          />
        </div>

        <button
          className={styles.primaryButton}
          onClick={addObservation}
          disabled={status === "Saving observation..."}
        >
          {status === "Saving observation..." ? "Saving..." : "Save Observation"}
        </button>
      </section>

      <details className={styles.details}>
        <summary>Coaching Evaluation</summary>

        <div className={styles.detailsContent}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Coach Rank</label>
              <input
                className={styles.input}
                type="number"
                min="1"
                value={evaluation.coachRank ?? ""}
                onChange={(e) =>
                  updateEvaluationField(
                    "coachRank",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Primary Position</label>
              <select
                className={styles.select}
                value={evaluation.primaryPosition ?? ""}
                onChange={(e) =>
                  updateEvaluationField(
                    "primaryPosition",
                    e.target.value ? (e.target.value as Position) : null
                  )
                }
              >
                <option value="">Not set</option>
                {POSITIONS.map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confidence</label>
              <select
                className={styles.select}
                value={evaluation.confidence}
                onChange={(e) =>
                  updateEvaluationField(
                    "confidence",
                    e.target.value as Confidence
                  )
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Player Type</label>
              <input
                className={styles.input}
                value={evaluation.playerType ?? ""}
                onChange={(e) =>
                  updateEvaluationField(
                    "playerType",
                    e.target.value || null
                  )
                }
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label className={styles.label}>Secondary Positions</label>
            <div className={styles.secondaryPositions}>
              {POSITIONS.map((position) => (
                <label className={styles.checkbox} key={position}>
                  <input
                    type="checkbox"
                    checked={evaluation.secondaryPositions.includes(position)}
                    onChange={() => toggleSecondaryPosition(position)}
                  />
                  {position}
                </label>
              ))}
            </div>
          </div>

          <h3>Skill Ratings</h3>

          <div className={styles.ratingGrid}>
            {RATINGS.map(([field, label]) => (
              <div className={styles.field} key={field}>
                <label className={styles.label}>{label}</label>
                <select
                  className={styles.select}
                  value={evaluation[field] ?? ""}
                  onChange={(e) =>
                    updateEvaluationField(
                      field,
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">Not rated</option>
                  <option value="1">1 - Developing</option>
                  <option value="2">2</option>
                  <option value="3">3 - Average</option>
                  <option value="4">4</option>
                  <option value="5">5 - Strong</option>
                </select>
              </div>
            ))}
          </div>

          <div className={styles.field} style={{ marginTop: 16 }}>
            <label className={styles.label}>Strengths</label>
            <textarea
              className={styles.textarea}
              value={evaluation.strengths ?? ""}
              onChange={(e) =>
                updateEvaluationField(
                  "strengths",
                  e.target.value || null
                )
              }
            />
          </div>

          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.label}>Development Priorities</label>
            <textarea
              className={styles.textarea}
              value={evaluation.developmentPriorities ?? ""}
              onChange={(e) =>
                updateEvaluationField(
                  "developmentPriorities",
                  e.target.value || null
                )
              }
            />
          </div>

          <div className={styles.field} style={{ marginTop: 12 }}>
            <label className={styles.label}>Coach Notes</label>
            <textarea
              className={styles.textarea}
              value={evaluation.coachNotes ?? ""}
              onChange={(e) =>
                updateEvaluationField(
                  "coachNotes",
                  e.target.value || null
                )
              }
            />
          </div>

          <button
            className={styles.primaryButton}
            onClick={saveEvaluation}
            disabled={!player.activeSeason || status === "Saving evaluation..."}
          >
            {status === "Saving evaluation..." ? "Saving..." : "Save Evaluation"}
          </button>
        </div>
      </details>

      <details className={styles.details}>
        <summary>
          Observation History ({player.observations.length})
        </summary>

        <div className={styles.detailsContent}>
          {player.observations.length === 0 && (
            <p>No coaching observations yet.</p>
          )}

          {player.observations.map((observation) => (
            <div className={styles.observation} key={observation.id}>
              <div className={styles.observationMeta}>
                <span>{observation.category.replaceAll("_", " ")}</span>
                <span>•</span>
                <span>{observation.source}</span>
                <span>•</span>
                <span>
                  {new Date(observation.date).toLocaleDateString()}
                </span>
              </div>

              {observation.game && (
                <div className={styles.game}>
                  vs. {observation.game.opponent}
                </div>
              )}

              <div className={styles.observationNote}>
                {observation.note}
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className={styles.details}>
        <summary>Player Details</summary>

        <div className={styles.detailsContent}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Name</label>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Number</label>
              <input
                className={styles.input}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Shoot Side</label>
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

            <div className={styles.field}>
              <label className={styles.label}>Parents Names</label>
              <input
                className={styles.input}
                value={parentsName}
                onChange={(e) => setParentsName(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.button}
              onClick={savePlayerDetails}
              disabled={status === "Saving player details..."}
            >
              {status === "Saving player details..." ? "Saving..." : "Save Player Details"}
            </button>

            <button
              className={styles.button}
              onClick={removePlayer}
            >
              Delete Player
            </button>
          </div>
        </div>
      </details>
    </main>
  );
}




