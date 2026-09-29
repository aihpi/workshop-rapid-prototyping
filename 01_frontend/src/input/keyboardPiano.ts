import { DRUM_LANES, DRUM_VOICES } from "@hpi/shared";
import type { TrackKind } from "@hpi/shared";

/**
 * The home-row piano every DAW ships: A is C, W is C sharp, and so on up to K,
 * the C an octave higher. Z and X shift the octave. On a drum track the same
 * keys pick drum voices instead, bottom lane first, so A is the kick.
 */
const WHITE_AND_BLACK: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
};

export const OCTAVE_DOWN = "KeyZ";
export const OCTAVE_UP = "KeyX";
export const DEFAULT_OCTAVE = 4;

/** Drum voices in playing order: kick on A, then up the kit. */
const DRUMS_BY_KEY = [...DRUM_LANES].reverse().map((lane) => DRUM_VOICES[lane]);

export function keyToPitch(code: string, octave: number, kind: TrackKind = "pitched"): number | null {
  const offset = WHITE_AND_BLACK[code];
  if (offset === undefined) return null;
  if (kind === "drum") return DRUMS_BY_KEY[offset] ?? null;
  const pitch = 12 * (octave + 1) + offset;
  return pitch >= 0 && pitch <= 127 ? pitch : null;
}

export const clampOctave = (octave: number): number => Math.min(8, Math.max(0, octave));
