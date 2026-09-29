import { PPQ, ticksPerBeat } from "@hpi/shared";
import type { TimeSig } from "@hpi/shared";

/** Pure timing for the metronome, so the accents can be tested without Tone. */
export const beatSeconds = (timeSig: TimeSig, bpm: number): number => (ticksPerBeat(timeSig) / PPQ) * (60 / bpm);

export type Click = { offsetSec: number; accent: boolean };

/** The clicks of a count-in, relative to its first beat. */
export function clickTimes(bars: number, timeSig: TimeSig, bpm: number): Click[] {
  const beats = bars * timeSig[0];
  const out: Click[] = [];
  for (let i = 0; i < beats; i++) out.push({ offsetSec: i * beatSeconds(timeSig, bpm), accent: i % timeSig[0] === 0 });
  return out;
}

/** Which beat of the bar a transport position falls on. Rounded, because the callback fires a hair early or late. */
export function beatOf(ticks: number, timeSig: TimeSig): { beat: number; accent: boolean } {
  const beat = Math.round(ticks / ticksPerBeat(timeSig)) % timeSig[0];
  return { beat, accent: beat === 0 };
}
