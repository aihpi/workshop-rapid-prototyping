// Musical time is measured in integer ticks. PPQ matches Tone.js so the two
// clocks never need converting, and integers mean no float drift when snapping.
export const PPQ = 192;

export type TimeSig = readonly [beats: number, unit: number];

export const ticksPerBeat = ([, unit]: TimeSig): number => (PPQ * 4) / unit;
export const ticksPerBar = (sig: TimeSig): number => sig[0] * ticksPerBeat(sig);
export const barsToTicks = (bars: number, sig: TimeSig): number => Math.round(bars * ticksPerBar(sig));
export const ticksToBars = (ticks: number, sig: TimeSig): number => ticks / ticksPerBar(sig);

/** A sixteenth note, the step-grid resolution. */
export const STEP_TICKS = PPQ / 4;

export const snapTicks = (ticks: number, grid: number): number => Math.round(ticks / grid) * grid;

/** Drum voices use General MIDI numbers so a drum pattern is just notes. */
export const DRUM_VOICES = {
  kick: 36,
  snare: 38,
  clap: 39,
  closedHat: 42,
  openHat: 46,
  lowTom: 45,
  highTom: 50,
} as const;

export type DrumVoice = keyof typeof DRUM_VOICES;

/** Lane order in the step grid, top to bottom. */
export const DRUM_LANES: readonly DrumVoice[] = [
  "highTom",
  "lowTom",
  "openHat",
  "closedHat",
  "clap",
  "snare",
  "kick",
];

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonicMinor: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
} as const;

export type ScaleName = keyof typeof SCALES;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const midiToNoteName = (midi: number): string => {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
};

export const inScale = (midi: number, root: number, scale: ScaleName): boolean =>
  (SCALES[scale] as readonly number[]).includes((midi - root + 120) % 12);
