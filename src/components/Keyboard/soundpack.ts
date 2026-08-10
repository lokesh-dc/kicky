import { evdevFor } from "./keycodes";

// ─── Config schema (mechvibes-compatible) ──────────────────────────────────

interface ConfigV1 {
  version?: 1;
  key_define_type: "single";
  sound: string; // single sprite file, e.g. "sound.ogg"
  defines: Record<string, [number, number]>; // keycode -> [offsetMs, durationMs]
}

interface ConfigV2 {
  version: 2;
  key_define_type: "multi";
  sound?: string;   // fallback keydown file(s), supports {0-4} range syntax
  soundup?: string; // fallback keyup file(s)
  defines: Record<string, string>; // keycode(-up) -> filename, supports {0-4}
}

type SoundpackConfig = ConfigV1 | ConfigV2;

// ─── Utilities ──────────────────────────────────────────────────────────────

/** Expands "generic{0-4}.mp3" into a random pick among generic0..generic4.mp3 */
function resolveRangeToken(pattern: string): string {
  const match = pattern.match(/\{(\d+)-(\d+)\}/);
  if (!match) return pattern;
  const [full, loStr, hiStr] = match;
  const lo = parseInt(loStr, 10);
  const hi = parseInt(hiStr, 10);
  const n = lo + Math.floor(Math.random() * (hi - lo + 1));
  return pattern.replace(full, String(n));
}

// ─── SoundPack class ─────────────────────────────────────────────────────────

export class SoundPack {
  private ctx: AudioContext;
  private config: SoundpackConfig | null = null;
  private basePath: string;

  // v1: one decoded sprite buffer, sliced per keystroke
  private spriteBuffer: AudioBuffer | null = null;

  // v2: cache of individually decoded files, keyed by filename
  private fileCache = new Map<string, AudioBuffer>();

  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(basePath: string, ctx?: AudioContext) {
    // basePath e.g. "/soundpacks/cherry-mx-black" (folder in /public containing config.json + audio)
    this.basePath = basePath.replace(/\/$/, "");
    this.ctx = ctx ?? new AudioContext();
  }

  /** Loads config.json and pre-decodes audio. Call once, then await before playing. */
  async load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this._load();
    return this.loadPromise;
  }

  private async _load(): Promise<void> {
    const res = await fetch(`${this.basePath}/config.json`);
    if (!res.ok) {
      throw new Error(`Failed to load soundpack config at ${this.basePath}/config.json`);
    }
    const config: SoundpackConfig = await res.json();
    this.config = config;

    if (config.key_define_type === "single") {
      const audioRes = await fetch(`${this.basePath}/${config.sound}`);
      const arrayBuffer = await audioRes.arrayBuffer();
      this.spriteBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    } else {
      // v2: pre-decode every unique file referenced (fallback + defines)
      const files = new Set<string>();
      const addPattern = (p?: string) => {
        if (!p) return;
        // For range patterns, decode every variant up front
        const match = p.match(/\{(\d+)-(\d+)\}/);
        if (match) {
          const lo = parseInt(match[1], 10);
          const hi = parseInt(match[2], 10);
          for (let i = lo; i <= hi; i++) files.add(p.replace(match[0], String(i)));
        } else {
          files.add(p);
        }
      };
      addPattern(config.sound);
      addPattern(config.soundup);
      Object.values(config.defines).forEach(addPattern);

      await Promise.all(
        Array.from(files).map(async (file) => {
          try {
            const res = await fetch(`${this.basePath}/${file}`);
            const buf = await res.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(buf);
            this.fileCache.set(file, decoded);
          } catch {
            // Skip files that fail to load rather than aborting the whole pack
          }
        })
      );
    }

    this.loaded = true;
  }

  /** Play the sound for a given browser KeyboardEvent.code, on keydown or keyup. */
  playForCode(code: string, phase: "down" | "up" = "down", volume = 0.8) {
    if (!this.loaded || !this.config) return;
    const evdev = evdevFor(code);
    if (evdev === null) return this.playFallback(phase, volume);
    this.playForKeycode(evdev, phase, volume);
  }

  /** Play by raw evdev keycode number. */
  playForKeycode(keycode: number, phase: "down" | "up" = "down", volume = 0.8) {
    if (!this.loaded || !this.config) return;

    if (this.config.key_define_type === "single") {
      // v1: only keydown sprite slices are supported
      if (phase === "up") return;
      const entry = this.config.defines[String(keycode)];
      if (!entry) return this.playFallback(phase, volume);
      const [offsetMs, durationMs] = entry;
      this.playSpriteSlice(offsetMs, durationMs, volume);
      return;
    }

    // v2: multi-file
    const key = phase === "up" ? `${keycode}-up` : String(keycode);
    const pattern = this.config.defines[key];
    if (!pattern) return this.playFallback(phase, volume);
    const filename = resolveRangeToken(pattern);
    this.playFile(filename, volume);
  }

  /** Fallback to the pack's generic sound/soundup when no specific key mapping exists. */
  private playFallback(phase: "down" | "up", volume: number) {
    if (!this.config || this.config.key_define_type !== "multi") return;
    const pattern = phase === "up" ? this.config.soundup : this.config.sound;
    if (!pattern) return;
    const filename = resolveRangeToken(pattern);
    // If the pack's declared generic file is missing (e.g. NK Cream declares
    // sound.ogg but ships only per-key wavs), degrade to any cached sample.
    if (this.fileCache.has(filename)) {
      this.playFile(filename, volume);
      return;
    }
    const first = this.fileCache.values().next().value as AudioBuffer | undefined;
    if (first) {
      const source = this.ctx.createBufferSource();
      source.buffer = first;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    }
  }

  private playSpriteSlice(offsetMs: number, durationMs: number, volume: number) {
    if (!this.spriteBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.spriteBuffer;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(this.ctx.currentTime, offsetMs / 1000, durationMs / 1000);
  }

  private playFile(filename: string, volume: number) {
    const buffer = this.fileCache.get(filename);
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  get isLoaded() {
    return this.loaded;
  }

  get audioContext() {
    return this.ctx;
  }
}