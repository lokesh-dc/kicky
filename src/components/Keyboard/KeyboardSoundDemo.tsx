"use client";

import { useEffect, useRef, useState } from "react";
import { useKeyboardSound } from "./useKeyboardSound";
import KeyboardVisual from "./KeyboardVisual";

interface PackDef {
  path: string;
  label: string;
}

// Add more entries here as you download/unzip more packs into /public/soundpacks/
const AVAILABLE_PACKS: PackDef[] = [
  { path: "/soundpacks/cherrymx-blue-abs", label: "Cherry MX Blue ABS" },
  { path: "/soundpacks/cherrymx-blue-abs-2", label: "Cherry MX Blue ABS 2" },
  { path: "/soundpacks/eg-oreo", label: "EG Oreo" },
  { path: "/soundpacks/nk-cream", label: "NK Cream" },
];

type Status = "idle" | "dismantling" | "loading";

export default function KeyboardSoundDemo() {
  const [packPath, setPackPath] = useState(AVAILABLE_PACKS[0].path);
  const [volume, setVolume] = useState(0.8);
  const [enabled, setEnabled] = useState(true);
  const [showLegends, setShowLegends] = useState(false);
  const [scattered, setScattered] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const timerRef = useRef<number | undefined>(undefined);

  const { playCode, isReady, error } = useKeyboardSound({
    packPath,
    volume,
    enabled,
  });

  const selected = AVAILABLE_PACKS.find((p) => p.path === packPath)!;

  // Dismantle -> load -> reassemble when the pack selection changes
  const handlePackChange = (path: string) => {
    if (path === packPath || status !== "idle") return;
    const next = AVAILABLE_PACKS.find((p) => p.path === path);
    if (!next) return;
    setStatus("dismantling");
    setScattered(true);
    timerRef.current = window.setTimeout(() => {
      setPackPath(next.path);
      setStatus("loading");
    }, 620);
  };

  // Once the new soundpack is ready, bring the keys back together.
  // Gated on status === "loading" so the old pack staying ready during
  // "dismantling" doesn't prematurely re-assemble the keys.
  useEffect(() => {
    if (status !== "loading" || !isReady || !scattered) return;
    const t = window.setTimeout(() => {
      setScattered(false);
      setStatus("idle");
    }, 250);
    return () => window.clearTimeout(t);
  }, [status, isReady, scattered]);

  useEffect(() => {
    if (status === "loading" && error) {
      setScattered(false);
      setStatus("idle");
    }
  }, [status, error]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const statusText =
    status === "dismantling"
      ? "Dismantling…"
      : status === "loading"
        ? error
          ? "Failed to load pack"
          : `Loading ${selected.label}…`
        : isReady
          ? `${selected.label} · ready`
          : "Loading…";

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandLogo}>⌨️</span>
          <span style={styles.brandName}>klicky</span>
        </div>

        <div style={styles.statusPill}>
          <span
            style={{
              ...styles.statusDot,
              background:
                status === "idle"
                  ? isReady
                    ? "#4ade80"
                    : "#facc15"
                  : "#ff6b4a",
            }}
          />
          <span style={styles.statusText}>{statusText}</span>
        </div>

        <div style={styles.headerRight}>
          <button
            onClick={() => setEnabled((e) => !e)}
            style={{
              ...styles.toggle,
              background: enabled ? "#ff6b4a" : "#1e293b",
              boxShadow: enabled ? "0 0 18px #ff6b4a66" : "none",
            }}
            aria-pressed={enabled}
          >
            {enabled ? "🔊 Sound On" : "🔇 Sound Off"}
          </button>
        </div>
      </header>

      <main style={styles.stage}>
        <KeyboardVisual
          scattered={scattered}
          showLegends={showLegends}
          onKeyPress={(code) => playCode(code, "down")}
        />
      </main>

      <div style={styles.controls}>
        <label style={styles.control}>
          <span style={styles.controlLabel}>Sound pack</span>
          <select
            value={packPath}
            onChange={(e) => handlePackChange(e.target.value)}
            style={styles.select}
          >
            {AVAILABLE_PACKS.map((p) => (
              <option key={p.path} value={p.path}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.control}>
          <span style={styles.controlLabel}>Volume — {Math.round(volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </label>

        <label style={styles.control}>
          <span style={styles.controlLabel}>Legends</span>
          <button
            onClick={() => setShowLegends((v) => !v)}
            style={{
              ...styles.legendToggle,
              background: showLegends ? "#2dd9e8" : "#1e1b33",
              color: showLegends ? "#04323d" : "#94a3b8",
            }}
            aria-pressed={showLegends}
          >
            {showLegends ? "Shown" : "Hidden"}
          </button>
        </label>
      </div>

      <p style={styles.hint}>
        Type or click any key — it depresses and glows coral. Keys fly apart and back together
        when you switch packs.
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at 12% 100%, rgba(255, 0, 180, 0.28), transparent 55%), linear-gradient(135deg, #3f7ca0 0%, #5b3e8f 48%, #1b1233 100%)",
    color: "#e2e8f0",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "20px clamp(16px, 4vw, 64px) 64px",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 18,
    borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandLogo: { fontSize: 26 },
  brandName: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.5px",
    background: "linear-gradient(135deg, #ffb3d9, #c4b5fd)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    padding: "7px 14px",
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  statusText: { fontSize: 12, color: "#e2e8f0", fontWeight: 600 },
  headerRight: { display: "flex", alignItems: "center", gap: 14 },
  toggle: {
    border: "none",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "0.3px",
    whiteSpace: "nowrap",
  },
  stage: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(24px, 5vh, 64px) 0",
    width: "100%",
    maxWidth: 1200,
    margin: "0 auto",
  },
  controls: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: "clamp(16px, 4vw, 48px)",
    flexWrap: "wrap",
    padding: "0 0 8px",
  },
  control: { display: "flex", flexDirection: "column", gap: 8, minWidth: 220 },
  controlLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.55)",
  },
  select: {
    background: "rgba(27, 18, 51, 0.7)",
    color: "#e2e8f0",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    outline: "none",
  },
  slider: {
    width: "100%",
    accentColor: "#ff6b4a",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  legendToggle: {
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
  },
  hint: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 13,
    marginTop: 8,
  },
};
