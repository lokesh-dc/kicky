"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./KeyboardVisual.module.css";

interface KeySpec {
  code: string;
  label: string;
  sub?: string;
  w?: number;
}

// 60% ANSI layout, each key tagged with its KeyboardEvent.code.
// Widths in units (1u = base key).
const ROWS: KeySpec[][] = [
  [
    { code: "Backquote", label: "`", sub: "~" },
    { code: "Digit1", label: "1", sub: "!" },
    { code: "Digit2", label: "2", sub: "@" },
    { code: "Digit3", label: "3", sub: "#" },
    { code: "Digit4", label: "4", sub: "$" },
    { code: "Digit5", label: "5", sub: "%" },
    { code: "Digit6", label: "6", sub: "^" },
    { code: "Digit7", label: "7", sub: "&" },
    { code: "Digit8", label: "8", sub: "*" },
    { code: "Digit9", label: "9", sub: "(" },
    { code: "Digit0", label: "0", sub: ")" },
    { code: "Minus", label: "-", sub: "_" },
    { code: "Equal", label: "=", sub: "+" },
    { code: "Backspace", label: "⌫", w: 2 },
  ],
  [
    { code: "Tab", label: "Tab", w: 1.5 },
    { code: "KeyQ", label: "Q" },
    { code: "KeyW", label: "W" },
    { code: "KeyE", label: "E" },
    { code: "KeyR", label: "R" },
    { code: "KeyT", label: "T" },
    { code: "KeyY", label: "Y" },
    { code: "KeyU", label: "U" },
    { code: "KeyI", label: "I" },
    { code: "KeyO", label: "O" },
    { code: "KeyP", label: "P" },
    { code: "BracketLeft", label: "[", sub: "{" },
    { code: "BracketRight", label: "]", sub: "}" },
    { code: "Backslash", label: "\\", sub: "|", w: 1.5 },
  ],
  [
    { code: "CapsLock", label: "Caps", w: 1.75 },
    { code: "KeyA", label: "A" },
    { code: "KeyS", label: "S" },
    { code: "KeyD", label: "D" },
    { code: "KeyF", label: "F" },
    { code: "KeyG", label: "G" },
    { code: "KeyH", label: "H" },
    { code: "KeyJ", label: "J" },
    { code: "KeyK", label: "K" },
    { code: "KeyL", label: "L" },
    { code: "Semicolon", label: ";", sub: ":" },
    { code: "Quote", label: "'", sub: '"' },
    { code: "Enter", label: "Enter", w: 2.25 },
  ],
  [
    { code: "ShiftLeft", label: "Shift", w: 2.25 },
    { code: "KeyZ", label: "Z" },
    { code: "KeyX", label: "X" },
    { code: "KeyC", label: "C" },
    { code: "KeyV", label: "V" },
    { code: "KeyB", label: "B" },
    { code: "KeyN", label: "N" },
    { code: "KeyM", label: "M" },
    { code: "Comma", label: ",", sub: "<" },
    { code: "Period", label: ".", sub: ">" },
    { code: "Slash", label: "/", sub: "?" },
    { code: "ShiftRight", label: "Shift", w: 2.75 },
  ],
  [
    { code: "ControlLeft", label: "Ctrl", w: 1.25 },
    { code: "MetaLeft", label: "⌘", w: 1.25 },
    { code: "AltLeft", label: "Alt", w: 1.25 },
    { code: "Space", label: "", w: 6.25 },
    { code: "AltRight", label: "Alt", w: 1.25 },
    { code: "MetaRight", label: "⌘", w: 1.25 },
    { code: "ControlRight", label: "Ctrl", w: 1.25 },
  ],
];

// Four-color diagonal gradient block (top-left staircase).
// Row r of the first 4 rows gets gradient[r]; the block shrinks by
// one key per row: 4 → 3 → 2 → 1 keys.
const GRADIENT = [
  { top: "#5eeaf6", bottom: "#2DD9E8", edge: "#17a8c9", legend: "#04323d" },
  { top: "#ff6a62", bottom: "#F4433D", edge: "#c22f2a", legend: "#ffffff" },
  { top: "#ffa03d", bottom: "#FF8A1E", edge: "#d96d10", legend: "#3a1d02" },
  { top: "#ffe9b0", bottom: "#FCE29B", edge: "#d4b46a", legend: "#5a4212" },
];

const GRADIENT_ROWS = 4; // staircase spans the first 4 rows
const GRADIENT_SHAPE = [4, 3, 2, 1]; // keys per row, shrinking

interface KeyboardVisualProps {
  /** When true, keys fly apart from the board (dismantle) and hover */
  scattered?: boolean;
  /** Fired when a key is clicked/tapped (code) — e.g. to play a sound */
  onKeyPress?: (code: string) => void;
}

export default function KeyboardVisual({
  scattered = false,
  onKeyPress,
}: KeyboardVisualProps) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());

  const press = useCallback((code: string) => {
    setPressed((prev) => {
      if (prev.has(code)) return prev;
      const next = new Set(prev);
      next.add(code);
      return next;
    });
  }, []);

  const release = useCallback((code: string) => {
    setPressed((prev) => {
      if (!prev.has(code)) return prev;
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      // Prevent Space / arrows from scrolling the page while demoing
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      press(e.code);
    };
    const handleUp = (e: KeyboardEvent) => release(e.code);
    const handleBlur = () => setPressed(new Set());

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [press, release]);

  // Per-key scatter offsets (radial explosion from board center), computed once
  const scatterVars = useMemo(() => {
    let idx = 0;
    const centerRow = (ROWS.length - 1) / 2;
    const vars: Record<string, React.CSSProperties> = {};
    for (let r = 0; r < ROWS.length; r++) {
      const row = ROWS[r];
      const rowWidth = row.reduce((sum, k) => sum + (k.w ?? 1), 0);
      let col = 0;
      for (const k of row) {
        const w = k.w ?? 1;
        const colCenter = col + w / 2 - rowWidth / 2;
        const dy = r - centerRow;
        const dist = Math.hypot(colCenter, dy) || 0.5;
        vars[k.code] = {
          "--sx": `${(colCenter / rowWidth) * 900}px`,
          "--sy": `${dy * 120 - dist * 55}px`,
          "--sr": `${(idx % 2 === 0 ? 1 : -1) * (8 + dist * 9)}deg`,
          "--idx": idx,
        } as React.CSSProperties;
        col += w + 0.3;
        idx++;
      }
    }
    return vars;
  }, []);

  const capVars = (r: number, c: number): React.CSSProperties => {
    // Gradient staircase: row r, key index c
    if (r < GRADIENT_ROWS && c < GRADIENT_SHAPE[r]) {
      const g = GRADIENT[r];
      return {
        "--t1": g.top,
        "--t2": g.bottom,
        "--edge": g.edge,
        "--legend": g.legend,
      } as React.CSSProperties;
    }
    return {}; // mauve default from CSS
  };

  return (
    <div className={styles.scene}>
      <div className={`${styles.board} ${scattered ? styles.boardScattered : ""}`}>
        {ROWS.map((row, r) => (
          <div key={r} className={styles.row}>
            {row.map((k, c) => {
              const isPressed = pressed.has(k.code);
              return (
                <div
                  key={k.code}
                  aria-label={k.label}
                  className={`${styles.key} ${isPressed ? styles.keyPressed : ""}`}
                  style={{
                    flexGrow: k.w ?? 1,
                    ...capVars(r, c),
                    ...scatterVars[k.code],
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    press(k.code);
                    onKeyPress?.(k.code);
                  }}
                  onPointerUp={() => release(k.code)}
                  onPointerLeave={() => release(k.code)}
                >
                  <div className={styles.keyFront} />
                  <div className={styles.keyTop}>
                    {k.sub && <span className={styles.sub}>{k.sub}</span>}
                    {k.label && <span className={styles.label}>{k.label}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
