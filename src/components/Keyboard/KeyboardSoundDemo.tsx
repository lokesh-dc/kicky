"use client";

import { useState } from "react";
import { useKeyboardSound } from "./useKeyboardSound";

// Add more entries here as you download/unzip more packs into /public/soundpacks/
const AVAILABLE_PACKS = [
  { path: "/soundpacks/cherrymx-blue-abs", label: "Cherry MX Blue ABS", color: "#94a3b8" },
  { path: "/soundpacks/cherrymx-blue-abs-2", label: "Cherry MX Blue ABS 2", color: "#94a3b8" },
  { path: "/soundpacks/eg-oreo", label: "EG Oreo", color: "#94a3b8" },
  { path: "/soundpacks/nk-cream", label: "NK Cream", color: "#fde68a" },
];

export default function KeyboardSoundDemo() {
  const [packPath, setPackPath] = useState(AVAILABLE_PACKS[0].path);
  const [volume, setVolume] = useState(0.8);
  const [enabled, setEnabled] = useState(true);
  const [keyCount, setKeyCount] = useState(0);

  const { playCode, isReady, error } = useKeyboardSound({
    packPath,
    volume,
    enabled,
  });

  const activePack = AVAILABLE_PACKS.find((p) => p.path === packPath)!;

  const handleTestPress = () => {
    playCode("Space", "down");
    setKeyCount((c) => c + 1);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>⌨️</div>
        <h1 style={styles.title}>Klack</h1>
        <p style={styles.subtitle}>
          {isReady
            ? "Real mechanical keyboard samples, playing in your browser"
            : error
              ? `Failed to load pack: ${error}`
              : "Loading soundpack…"}
        </p>
      </header>

      <div style={styles.toggleRow}>
        <button
          onClick={() => setEnabled((e) => !e)}
          style={{
            ...styles.toggle,
            background: enabled ? "#6d28d9" : "#1e293b",
            boxShadow: enabled ? "0 0 16px #6d28d980" : "none",
          }}
        >
          {enabled ? "🔊 Sound On" : "🔇 Sound Off"}
        </button>
        <span style={styles.keyCount}>{keyCount.toLocaleString()} keys pressed</span>
      </div>

      {/* Pack selector */}
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>Sound Pack</h2>
        <div style={styles.switchGrid}>
          {AVAILABLE_PACKS.map((pack) => (
            <button
              key={pack.path}
              onClick={() => setPackPath(pack.path)}
              style={{
                ...styles.switchBtn,
                borderColor: packPath === pack.path ? pack.color : "transparent",
                background: packPath === pack.path ? `${pack.color}18` : "#0f172a",
                boxShadow: packPath === pack.path ? `0 0 12px ${pack.color}40` : "none",
              }}
            >
              <span style={{ ...styles.dot, background: pack.color }} />
              <span style={styles.switchName}>{pack.label}</span>
            </button>
          ))}
        </div>
        <p style={styles.hint}>
          Drop more packs into <code>/public/soundpacks/&lt;name&gt;</code> and add them to{" "}
          <code>AVAILABLE_PACKS</code> in this file.
        </p>
      </section>

      {/* Volume */}
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>Volume — {Math.round(volume * 100)}%</h2>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={styles.slider}
        />
      </section>

      {/* Test pad */}
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>Test It</h2>
        <p style={styles.hint}>Type anywhere on the page, or tap the button below.</p>
        <button
          onMouseDown={handleTestPress}
          disabled={!isReady}
          style={{
            ...styles.bigKey,
            borderColor: activePack.color,
            opacity: isReady ? 1 : 0.5,
            boxShadow: `0 6px 0 ${activePack.color}60, 0 0 20px ${activePack.color}30`,
          }}
        >
          <span style={styles.bigKeyLabel}>SPACE</span>
          <span style={styles.bigKeyHint}>{isReady ? "tap or press any key" : "loading…"}</span>
        </button>
      </section>

      {/* Usage snippet */}
      <section style={styles.section}>
        <h2 style={styles.sectionLabel}>Usage in your project</h2>
        <pre style={styles.code}>{`import { useKeyboardSound } from "@/lib/useKeyboardSound";

// Plays real sampled clicks on every keydown, globally
const { isReady } = useKeyboardSound({
  packPath: "${packPath}",
  volume: ${volume.toFixed(2)},
  enabled: true,
});`}</pre>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "#e2e8f0",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "40px 24px 80px",
    maxWidth: 680,
    margin: "0 auto",
  },
  header: { textAlign: "center", marginBottom: 48 },
  logo: { fontSize: 48, marginBottom: 12 },
  title: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: "-1px",
    margin: "0 0 8px",
    background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: { color: "#64748b", margin: 0, fontSize: 15 },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 40,
    justifyContent: "center",
  },
  toggle: {
    border: "none",
    color: "#fff",
    padding: "10px 22px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "0.3px",
  },
  keyCount: { color: "#475569", fontSize: 13 },
  section: { marginBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 16,
  },
  switchGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  switchBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 12,
    border: "1.5px solid",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s",
    color: "#e2e8f0",
  },
  dot: { width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  switchName: { fontWeight: 600, fontSize: 13 },
  slider: { width: "100%", accentColor: "#6d28d9", cursor: "pointer" },
  hint: { color: "#64748b", fontSize: 13, marginTop: 10, lineHeight: 1.6 },
  bigKey: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "28px 0",
    background: "#0f172a",
    border: "1.5px solid",
    borderRadius: 16,
    cursor: "pointer",
    transition: "transform 0.08s, box-shadow 0.08s",
    color: "#e2e8f0",
    gap: 6,
  },
  bigKeyLabel: { fontSize: 20, fontWeight: 800, letterSpacing: "4px" },
  bigKeyHint: { fontSize: 11, color: "#475569" },
  code: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: "20px 24px",
    fontSize: 12,
    lineHeight: 1.7,
    overflowX: "auto",
    color: "#a5f3fc",
    whiteSpace: "pre",
  },
};
