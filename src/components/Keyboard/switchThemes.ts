/**
 * Per-switch visual themes for the on-screen keyboard.
 * Each switch/sound profile gets a default theme; the user can override
 * the theme independently of the sound via the "Visual" control.
 */

export interface KeyboardVisualTheme {
  id: string;
  label: string;
  /** Base keycap color (used for the cap's side wall / edge) */
  keycapBase: string;
  /** Top-face gradient stops, light → dark */
  keycapGradient: [string, string];
  legendColor: string;
  /** Background/plate visible in the gaps between keys */
  plateColor: string;
  /** Default wave color for this theme */
  accentColor: string;
  /** Optional second cap color for alternating layouts (e.g. Oreo) */
  altKeycapBase?: string;
  altKeycapGradient?: [string, string];
  altLegendColor?: string;
}

export const SWITCH_THEMES: KeyboardVisualTheme[] = [
  {
    id: "cherry-blue",
    label: "Cherry Blue",
    keycapBase: "#5a6a85",
    keycapGradient: ["#9db1cc", "#7c90ac"],
    legendColor: "#eef3fa",
    plateColor: "#232c3d",
    accentColor: "#38bdf8",
  },
  {
    id: "eg-oreo",
    label: "EG Oreo",
    keycapBase: "#c9c9d1",
    keycapGradient: ["#f2f2f5", "#dcdce2"],
    legendColor: "#2a2a2e",
    plateColor: "#17171b",
    accentColor: "#f472b6",
    altKeycapBase: "#2e2e33",
    altKeycapGradient: ["#4b4b52", "#333338"],
    altLegendColor: "#f5f5f7",
  },
  {
    id: "nk-cream",
    label: "NK Cream",
    keycapBase: "#c9b392",
    keycapGradient: ["#f0e4cd", "#ddcbaa"],
    legendColor: "#6b4a2b",
    plateColor: "#2b2118",
    accentColor: "#f59e0b",
  },
  {
    id: "purple",
    label: "Purple",
    keycapBase: "#6f5aa8",
    keycapGradient: ["#c4b5fd", "#a78bfa"],
    legendColor: "#f5f3ff",
    plateColor: "#241b3d",
    accentColor: "#a3e635",
  },
];

export const DEFAULT_THEME_ID = SWITCH_THEMES[0].id;

export function getTheme(id: string): KeyboardVisualTheme {
  return SWITCH_THEMES.find((t) => t.id === id) ?? SWITCH_THEMES[0];
}