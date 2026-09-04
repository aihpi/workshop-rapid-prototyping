import type { Clip, Pattern } from "@hpi/shared";

// The pure half of scheduling. A clip loops its pattern for as long as the clip
// lasts, starting `offsetTicks` into the pattern, so what a Tone.Part needs is
// the pattern's notes as pattern-relative events plus a window on the timeline.

export type PatternEvent = {
  /** Tone time string in ticks, pattern-relative. */
  time: string;
  pitch: number;
  velocity: number;
  durationTicks: number;
};

export type ClipWindow = {
  startTick: number;
  stopTick: number;
  /** Where inside the loop playback begins, already wrapped into the pattern. */
  offsetTicks: number;
  loopEndTicks: number;
};

/** Notes that start inside the pattern, as Part events. Anything past the end is dropped. */
export function patternEvents(pattern: Pattern): PatternEvent[] {
  return pattern.notes
    .filter((n) => n.start < pattern.lengthTicks)
    .map((n) => ({
      time: `${n.start}i`,
      pitch: n.pitch,
      velocity: n.velocity,
      durationTicks: n.duration,
    }));
}

export function clipWindow(clip: Clip, pattern: Pattern): ClipWindow {
  return {
    startTick: clip.startTick,
    stopTick: clip.startTick + clip.lengthTicks,
    offsetTicks: clip.offsetTicks % pattern.lengthTicks,
    loopEndTicks: pattern.lengthTicks,
  };
}
