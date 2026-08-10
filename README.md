# Klicky — Real Keyboards, Zero Hardware

A Web Audio playground that plays real sampled mechanical keyboard clicks on every keystroke — five community soundpacks, one tiny hook.

You can't feel a switch's character from a spec sheet, and video reviews flatten it into whatever mic and room the creator had. The only honest way to know how a Cherry MX Blue or an NK Cream actually sounds is to hear real samples. Klicky lets you try five boards right in the browser — before you commit to one.

## How it works

Klicky loads real [MechVibes](https://mechvibes.com/)-format soundpacks — the exact config and sample files the mechanical-keyboard community already ships — decodes them with the Web Audio API, and fires the correct sample for each physical key as you type.

- **Drop a pack into `/public`, add one line to a list, and it's playable.** No install, no conversion.
- **All playback is client-side.** After the initial load, buffers are cached in memory — no file is ever re-fetched, so every keystroke is a zero-latency `BufferSource → GainNode` play.

## Features

- **Soundpack Engine** — Loads real mechvibes-format packs, both single-sprite and multi-file layouts, straight out of `/public`.
- **Physical Key Mapping** — Maps every browser `KeyboardEvent.code` to the Linux evdev keycodes pack configs use, so backspace plays the backspace sample, not a generic click.
- **Zero-Install Playback** — Everything decodes and plays client-side with the Web Audio API; buffers are decoded once and cached.
- **Global Listening Hook** — A single `useKeyboardSound()` hook attaches to `window` and plays on every `keydown`, with key-repeat filtered out. Any page can add real keyboard sounds with four lines of code.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), start typing, and hear it immediately.

## Usage

```tsx
import { useKeyboardSound } from "@/components/Keyboard/useKeyboardSound";

function App() {
  const keyboard = useKeyboardSound("nk-cream", {
    volume: 0.6,
    playOnKeyUp: false,
  });

  return (
    <div {...(keyboard.isReady ? {} : {})}>
      Start typing — you'll hear it.
    </div>
  );
}
```

The hook exposes `playCode(code, phase)` and `playClick()`, supports per-pack volume, and offers an opt-in `playOnKeyUp` for quieter release samples when a pack defines them.

## Architecture

Klicky is a deliberately small stack:

| Layer | Description |
| --- | --- |
| **Hook layer** | `useKeyboardSound()` attaches global `keydown`/`keyup` listeners and exposes `playCode()`, `playClick()`, `isReady` and `error`. Volume, enabled and `playOnKeyUp` are plain options. |
| **SoundPack class** | `load()` fetches `config.json`, decodes audio and caches buffers. `playForCode()`/`playForKeycode()` route a key event to the correct sample — sprite slice or individual file. |
| **Keycode mapping** | A `CODE_TO_EVDEV` table translates browser `KeyboardEvent.code` into the numeric Linux evdev keycodes mechvibes configs expect. |
| **Web Audio API** | Decoded `AudioBuffer`s play through a `BufferSource → GainNode → destination` chain for sample-accurate, low-latency playback at a per-pack volume. |
| **Static packs** | Soundpacks live under `/public` as plain config + audio files, so adding a pack is a drop-in operation with zero build steps. |

## Engineering highlights

- **Dual-format loader** — One loader parses both mechvibes layouts: v1 slices a decoded sprite by `[offset, duration]`; v2 pre-decodes every referenced file, expanding `{0-4}` range tokens at decode time. Both formats flow through the same `playForCode()` path.
- **Buffer cache instead of re-fetch** — Every unique file a pack references is fetched and decoded once during `load()` and stored in a `Map` keyed by filename. Playback never touches the network again.
- **Key-repeat filtering** — The global listener drops any event where `e.repeat` is set, so fast typists and hold-to-repeat both sound clean instead of stuttering.
- **Gesture-aware AudioContext** — Browsers block `AudioContext` until a user gesture, so `playCode()` resumes a suspended context on demand, and the demo wires sound to `mousedown` as well as `keydown`.

## Performance

| Metric | Value |
| --- | --- |
| Sound packs | 5 (Mechvibes community format) |
| Mapped keys | 60+ evdev keycodes |
| Config formats | 2 (sprite + multi-file) |
| Post-load fetches | 0 (everything cached) |
| Per-key path | 1 node (`BufferSource → GainNode`) |
| Key-repeat | Filtered (`e.repeat` dropped) |

## Design decisions

- **A near-black stage** — Soundpack samples are mixed to sit on dark, focused surfaces; the demo renders on a deep slate stage so the audio is the entire focus.
- **One switch, one dial, one big key** — UI is limited to an on/off toggle, a volume slider, and a giant SPACE test pad. The whole point is to just type.
- **Show the integration code** — The page ends with a copy-ready snippet, because the real output of this project is a reusable hook, not a toy.

## Roadmap

- **Key-up samples by default** — Map and play release samples for packs that define `soundup`, so switches feel genuinely mechanical in both directions. *(planned)*
- **Shareable pack presets** — URL params like `?pack=nk-cream&volume=0.6` so a specific keyboard feel can be shared as a link. *(exploring)*
- **In-browser pack uploader** — Drag a mechvibes pack folder straight into the browser and hear it instantly — no code changes. *(exploring)*

## Tech stack

- **Framework** — Next.js, React, TypeScript
- **Audio** — Web Audio API
- **Source** — MechVibes community packs
- **Tooling** — ESLint, Playwright
