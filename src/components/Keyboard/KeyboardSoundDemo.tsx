"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useKeyboardSound } from "./useKeyboardSound";
import KeyboardVisual from "./KeyboardVisual";
import { SWITCH_THEMES, getTheme } from "./switchThemes";

interface PackDef {
  path: string;
  label: string;
  themeId: string;
}

const AVAILABLE_PACKS: PackDef[] = [
  { path: "/soundpacks/cherrymx-blue-abs", label: "Cherry MX Blue ABS", themeId: "cherry-blue" },
  { path: "/soundpacks/cherrymx-blue-abs-2", label: "Cherry MX Blue ABS 2", themeId: "cherry-blue" },
  { path: "/soundpacks/eg-oreo", label: "EG Oreo", themeId: "eg-oreo" },
  { path: "/soundpacks/nk-cream", label: "NK Cream", themeId: "nk-cream" },
];

const LS_VISUAL_THEME = "klicky-visual-theme";
const LS_WAVE_COLOR = "klicky-wave-color";

const QUOTES = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "How vexingly quick daft zebras jump.",
  "The five boxing wizards jump quickly.",
  "Sphinx of black quartz, judge my vow.",
  "Two driven jocks help fax my big quiz.",
  "The jay, pig, fox, zebra, and my wolves quack!",
  "Jived fox nymph grabs quick waltz.",
  "Jackdaws love my big sphinx of quartz.",
  "Crazy Frederick bought many very exquisite opal jewels.",
];

type Status = "idle" | "dismantling" | "loading";

export default function KeyboardSoundDemo() {
  const [packPath, setPackPath] = useState(AVAILABLE_PACKS[0].path);
  const [volume, setVolume] = useState(0.8);
  const [scattered, setScattered] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const timerRef = useRef<number | undefined>(undefined);

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);

  // Visual theme: null = "Auto" (follows the sound profile). Once the user
  // picks a theme explicitly it stays decoupled from the sound profile.
  const [visualThemeId, setVisualThemeId] = useState<string | null>(null);
  // Wave color: null = follow the theme's accentColor
  const [waveColor, setWaveColor] = useState<string | null>(null);

  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  const quote = QUOTES[quoteIndex];

  const { playCode, isReady, error } = useKeyboardSound({
    packPath,
    volume,
    enabled: true,
    globalListener: false,
  });

  const selected = AVAILABLE_PACKS.find((p) => p.path === packPath)!;

  // Restore persisted visual preferences (client-only effects; deferred via
  // microtask so the initial server render stays stable for hydration)
  useEffect(() => {
    const savedTheme = window.localStorage.getItem(LS_VISUAL_THEME);
    if (savedTheme && savedTheme !== "auto") {
      queueMicrotask(() => setVisualThemeId(savedTheme));
    }
    const savedColor = window.localStorage.getItem(LS_WAVE_COLOR);
    if (savedColor) {
      queueMicrotask(() => setWaveColor(savedColor));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LS_VISUAL_THEME, visualThemeId ?? "auto");
  }, [visualThemeId]);

  useEffect(() => {
    if (waveColor) window.localStorage.setItem(LS_WAVE_COLOR, waveColor);
    else window.localStorage.removeItem(LS_WAVE_COLOR);
  }, [waveColor]);

  const effectiveTheme = getTheme(visualThemeId ?? selected.themeId);
  const effectiveWaveColor = waveColor ?? effectiveTheme.accentColor;

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

  // Close volume popup on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setVolumeOpen(false);
      }
    };
    if (volumeOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [volumeOpen]);

  const handleTypingKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (status !== "idle") return;
      if (volumeOpen && (e.key === "Escape" || e.key === "Tab")) {
        setVolumeOpen(false);
        return;
      }
      if (volumeOpen) return;

      if (e.key === "Escape" || e.key === "Tab") {
        e.preventDefault();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        setTypedCount((c) => Math.max(0, c - 1));
        return;
      }

      if (e.key.length !== 1) return;

      if (typedCount >= quote.length) return;

      if (!startTime) setStartTime(Date.now());

      playCode(e.code, "down");

      if (quote[typedCount] === e.key) {
        const next = typedCount + 1;
        setTypedCount(next);

        if (next >= quote.length) {
          const elapsed = (Date.now() - (startTime ?? Date.now())) / 1000;
          const words = quote.split(" ").length;
          setWpm(Math.round((words / elapsed) * 60));
          setTimeout(() => {
            setQuoteIndex((i) => (i + 1) % QUOTES.length);
            setTypedCount(0);
            setStartTime(null);
          }, 1200);
        }
      }
    },
    [typedCount, quote, startTime, status, volumeOpen, playCode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleTypingKeyDown);
    return () => window.removeEventListener("keydown", handleTypingKeyDown);
  }, [handleTypingKeyDown]);

  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
  const liveWpm =
    startTime && typedCount > 0
      ? Math.round((typedCount / 5 / elapsed) * 60)
      : 0;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandMark} aria-hidden="true" />
          <span style={styles.brandName}>Klicky</span>
        </div>

        <div style={styles.controls}>
          <div style={styles.statusPill} title={error ?? undefined}>
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
            <select
              value={packPath}
              onChange={(e) => handlePackChange(e.target.value)}
              style={styles.packSelect}
            >
              {AVAILABLE_PACKS.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={styles.statusPill}
            title="Visual theme, independent of the sound profile"
          >
            <span style={styles.pillLabel}>Visual</span>
            <select
              value={visualThemeId ?? "auto"}
              onChange={(e) =>
                setVisualThemeId(e.target.value === "auto" ? null : e.target.value)
              }
              style={styles.packSelect}
            >
              <option value="auto">Auto (follow sound)</option>
              {SWITCH_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.statusPill} title="Wave light color">
            <span style={styles.pillLabel}>Wave</span>
            <label
              style={{
                ...styles.colorSwatch,
                background: effectiveWaveColor,
              }}
              title="Wave color"
            >
              <input
                type="color"
                value={effectiveWaveColor}
                onChange={(e) => setWaveColor(e.target.value)}
                style={styles.hiddenColorInput}
                aria-label="Wave color"
              />
            </label>
            {waveColor && (
              <button
                onClick={() => setWaveColor(null)}
                style={styles.resetBtn}
                title="Reset wave color to theme accent"
              >
                ↺
              </button>
            )}
          </div>

          <div style={styles.headerRight} ref={volumeRef}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setVolumeOpen((o) => !o)}
              style={styles.iconBtn}
              title="Volume"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#f4f4f5" />
                {volume === 0 ? (
                  <>
                    <line x1="23" y1="9" x2="17" y2="15" stroke="#f4f4f5" strokeWidth="2" strokeLinecap="round" />
                    <line x1="17" y1="9" x2="23" y2="15" stroke="#f4f4f5" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    {volume > 0.15 && (
                      <path d="M14.5 8.5a5 5 0 0 1 0 7" stroke="#f4f4f5" strokeWidth="2" strokeLinecap="round" />
                    )}
                    {volume > 0.5 && (
                      <path d="M17.5 5.5a10 10 0 0 1 0 13" stroke="#f4f4f5" strokeWidth="2" strokeLinecap="round" />
                    )}
                  </>
                )}
              </svg>
            </button>
            {volumeOpen && (
              <div style={styles.volumePopup}>
                <div style={styles.volumeSliderTrack}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={styles.verticalSlider}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      <div style={styles.typingArea}>
        <div className="rise-in" style={styles.quoteBox}>
          {quote.split("").map((char, i) => (
            <span
              key={i}
              style={{
                ...styles.quoteChar,
                color:
                  i < typedCount
                    ? quote[i] === char
                      ? "#ffffff"
                      : "#ff6b4a"
                    : "rgba(255, 255, 255, 0.32)",
              }}
            >
              {char === " " ? "\u00A0" : char}
              {i === typedCount - 1 && <span style={styles.cursor}>|</span>}
            </span>
          ))}
          {typedCount === 0 && <span style={styles.cursor}>|</span>}
        </div>
        <div style={styles.typingStats}>
          <span style={styles.stat}>
            WPM{" "}
            <strong>{startTime ? liveWpm : 0}</strong>
          </span>
          {wpm > 0 && typedCount >= quote.length && (
            <span style={{ ...styles.stat, color: "#4ade80" }}>
              Done! {wpm} WPM
            </span>
          )}
          <span style={styles.stat}>
            Progress{" "}
            <strong>
              {Math.round((typedCount / quote.length) * 100)}%
            </strong>
          </span>
        </div>
      </div>

      <main className="rise-in-delayed" style={styles.stage}>
        <KeyboardVisual
          scattered={scattered}
          onKeyPress={(code) => playCode(code, "down")}
          theme={effectiveTheme}
          waveColor={effectiveWaveColor}
        />
      </main>
      <p style={styles.hint}>Start typing to hear the switches and light up the board.</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background:
      "radial-gradient(1100px 520px at 50% -8%, rgba(255, 107, 74, 0.07), transparent 62%), #0b0b10",
    color: "#f4f4f5",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    padding: "20px clamp(16px, 4vw, 64px) 48px",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 12,
    paddingBottom: 18,
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    position: "relative" as const,
    zIndex: 50,
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    background: "linear-gradient(180deg, #2a2a31, #1c1c22)",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
    position: "relative" as const,
  },
  brandName: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: "-0.5px",
    color: "#fafafa",
  },
  controls: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.09)",
    padding: "7px 14px",
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  pillLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase" as const,
    color: "rgba(255, 255, 255, 0.4)",
    marginRight: 2,
  },
  colorSwatch: {
    position: "relative",
    width: 20,
    height: 20,
    borderRadius: "50%",
    flexShrink: 0,
    cursor: "pointer",
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.25), inset 0 1px 2px rgba(255,255,255,0.35)",
    overflow: "hidden",
  },
  hiddenColorInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
    border: "none",
    padding: 0,
  },
  resetBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 13,
    lineHeight: 1,
    padding: 0,
    cursor: "pointer",
    width: 16,
    height: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
  },
  packSelect: {
    background: "transparent",
    color: "#f4f4f5",
    border: "none",
    borderRadius: 0,
    padding: "0 16px 0 0",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    outline: "none",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23f4f4f5'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0 center",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  iconBtn: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.09)",
    color: "#f4f4f5",
    width: 40,
    height: 40,
    borderRadius: 999,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  volumePopup: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: -8,
    background: "#15151b",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    zIndex: 200,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  },
  volumeSliderTrack: {
    height: 140,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  verticalSlider: {
    width: 120,
    height: 6,
    accentColor: "#ff6b4a",
    cursor: "pointer",
    transform: "rotate(-90deg)",
    transformOrigin: "center center",
  },
  typingArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: "clamp(20px, 4vh, 48px) 0 0",
    maxWidth: 900,
    width: "100%",
    margin: "0 auto",
  },
  quoteBox: {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    fontSize: "clamp(18px, 2.5vw, 28px)",
    lineHeight: 1.8,
    letterSpacing: "1px",
    padding: "24px 32px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.09)",
    borderRadius: 16,
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    textAlign: "center" as const,
    maxWidth: "100%",
    wordBreak: "break-word" as const,
    minHeight: 80,
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "center",
    justifyContent: "center",
  },
  quoteChar: {
    transition: "color 0.15s, background 0.15s",
    borderRadius: 4,
    padding: "2px 1px",
  },
  cursor: {
    display: "inline-block",
    color: "#ff6b4a",
    fontWeight: 400,
    animation: "blink 1s step-end infinite",
    marginLeft: 2,
    fontSize: "1.1em",
    textShadow: "0 0 8px rgba(255, 107, 74, 0.5)",
  },
  typingStats: {
    display: "flex",
    gap: 24,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.4)",
    fontWeight: 600,
  },
  stat: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  stage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(12px, 2vh, 32px) 0 0",
    width: "100%",
    maxWidth: 1200,
    margin: "0 auto",
    position: "relative" as const,
  },
  hint: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 13,
    marginTop: 20,
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  },
};
