"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

const cardStyle = {
  marginTop: 16,
  padding: 16,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "#fff",
};

const inputStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ccc",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: 6,
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ccc",
  cursor: "pointer",
  fontWeight: 700,
};

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

    setStatus("Evaluation saved.");
    await load();
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
    setStatus("Observation saved.");
    await load();
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

    setStatus("Player details saved.");
    await load();
  }

  async function removePlayer() {
    if (!teamId) return setStatus("Missing teamId.");
    if (!confirm("Delete this player?")) return;

    setStatus("Deleting...");

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
    return (
      <main
        style={{
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <p>{status || "Loading..."}</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      <header>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>
              {player.number !== null ? `#${player.number} ` : ""}
              {player.name}
            </h1>

            <div style={{ opacity: 0.75 }}>
              {evaluation.primaryPosition ?? "Position not evaluated"}
              {evaluation.coachRank
                ? ` • Coach Rank #${evaluation.coachRank}`
                : ""}
              {player.activeSeason
                ? ` • ${player.activeSeason.name}`
                : " • No active season"}
            </div>
          </div>

          <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/players">Players</Link>
            <Link href={`/players/${player.id}/stats`}>Stats</Link>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </header>

      {status && (
        <div
          style={{
            marginTop: 16,
            padding: 10,
            borderRadius: 10,
            background: "#f5f5f5",
          }}
        >
          {status}
        </div>
      )}

      <section style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 0 }}>
          Coaching Evaluation
        </h2>

        {!player.activeSeason && (
          <p>
            This team does not currently have an active season. Evaluation
            data cannot be saved until one exists.
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Coach Rank</label>
            <input
              type="number"
              min="1"
              value={evaluation.coachRank ?? ""}
              onChange={(e) =>
                updateEvaluationField(
                  "coachRank",
                  e.target.value ? Number(e.target.value) : null
                )
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Primary Position</label>
            <select
              value={evaluation.primaryPosition ?? ""}
              onChange={(e) =>
                updateEvaluationField(
                  "primaryPosition",
                  e.target.value ? (e.target.value as Position) : null
                )
              }
              style={inputStyle}
            >
              <option value="">Not set</option>
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Confidence</label>
            <select
              value={evaluation.confidence}
              onChange={(e) =>
                updateEvaluationField(
                  "confidence",
                  e.target.value as Confidence
                )
              }
              style={inputStyle}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Player Type</label>
            <input
              value={evaluation.playerType ?? ""}
              onChange={(e) =>
                updateEvaluationField(
                  "playerType",
                  e.target.value || null
                )
              }
              placeholder="e.g. Two-way play driver"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Secondary Positions</label>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {POSITIONS.map((position) => (
              <label key={position}>
                <input
                  type="checkbox"
                  checked={evaluation.secondaryPositions.includes(position)}
                  onChange={() => toggleSecondaryPosition(position)}
                />{" "}
                {position}
              </label>
            ))}
          </div>
        </div>

        <h3 style={{ marginTop: 22 }}>Skill Ratings</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {RATINGS.map(([field, label]) => (
            <div key={field}>
              <label style={labelStyle}>{label}</label>

              <select
                value={evaluation[field] ?? ""}
                onChange={(e) =>
                  updateEvaluationField(
                    field,
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                style={inputStyle}
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

        <div style={{ marginTop: 18 }}>
          <label style={labelStyle}>Strengths</label>
          <textarea
            value={evaluation.strengths ?? ""}
            onChange={(e) =>
              updateEvaluationField("strengths", e.target.value || null)
            }
            rows={3}
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Development Priorities</label>
          <textarea
            value={evaluation.developmentPriorities ?? ""}
            onChange={(e) =>
              updateEvaluationField(
                "developmentPriorities",
                e.target.value || null
              )
            }
            rows={3}
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Coach Notes</label>
          <textarea
            value={evaluation.coachNotes ?? ""}
            onChange={(e) =>
              updateEvaluationField("coachNotes", e.target.value || null)
            }
            rows={3}
            style={inputStyle}
          />
        </div>

        <button
          onClick={saveEvaluation}
          disabled={!player.activeSeason}
          style={{
            ...buttonStyle,
            marginTop: 14,
            opacity: player.activeSeason ? 1 : 0.5,
          }}
        >
          Save Evaluation
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 0 }}>
          Quick Observation
        </h2>

        <p style={{ marginTop: 0, opacity: 0.75 }}>
          On mobile, tap the note field and use your phone keyboard's
          microphone to dictate the observation.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Source</label>
            <select
              value={observationSource}
              onChange={(e) => setObservationSource(e.target.value)}
              style={inputStyle}
            >
              <option value="GAME">Game</option>
              <option value="PRACTICE">Practice</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={observationCategory}
              onChange={(e) => setObservationCategory(e.target.value)}
              style={inputStyle}
            >
              {OBSERVATION_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Observation</label>
          <textarea
            value={observationNote}
            onChange={(e) => setObservationNote(e.target.value)}
            rows={4}
            placeholder="Example: Strong retrieval. Shoulder checked before reaching puck and used reverse when F1 took away wall."
            style={inputStyle}
          />
        </div>

        <button
          onClick={addObservation}
          style={{ ...buttonStyle, marginTop: 12 }}
        >
          Add Observation
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 0 }}>
          Observation History
        </h2>

        {player.observations.length === 0 && (
          <p style={{ opacity: 0.7 }}>No coaching observations yet.</p>
        )}

        {player.observations.map((observation) => (
          <div
            key={observation.id}
            style={{
              padding: "12px 0",
              borderTop: "1px solid #eee",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span>{observation.category.replaceAll("_", " ")}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>{observation.source}</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>
                {new Date(observation.date).toLocaleDateString()}
              </span>
            </div>

            {observation.game && (
              <div style={{ marginTop: 3, opacity: 0.7 }}>
                vs. {observation.game.opponent}
              </div>
            )}

            <div style={{ marginTop: 6 }}>{observation.note}</div>
          </div>
        ))}
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 0 }}>
          Player Details
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Number</label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Shoot Side</label>
            <select
              value={shootSide}
              onChange={(e) =>
                setShootSide(
                  e.target.value as "" | "LEFT" | "RIGHT"
                )
              }
              style={inputStyle}
            >
              <option value="">Not set</option>
              <option value="LEFT">Left</option>
              <option value="RIGHT">Right</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Parents Names</label>
            <input
              value={parentsName}
              onChange={(e) => setParentsName(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          <button onClick={savePlayerDetails} style={buttonStyle}>
            Save Player Details
          </button>

          <button
            onClick={removePlayer}
            style={{ ...buttonStyle, fontWeight: 400 }}
          >
            Delete Player
          </button>
        </div>
      </section>
    </main>
  );
}
