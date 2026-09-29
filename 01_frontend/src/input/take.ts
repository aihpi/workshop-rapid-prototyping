import { newId, snapTicks, STEP_TICKS } from "@hpi/shared";
import type { Clip, Note, Pattern } from "@hpi/shared";

/**
 * Turning a held key into a note in the pattern behind the clip being edited.
 * Pure, so the wrap-around and clamping can be tested without a transport.
 */
export type OpenNote = { pitch: number; velocity: number; startTick: number };

/** Song tick to a tick inside the pattern, honouring the clip's offset and looping; null outside the clip. */
export function toPatternTick(clip: Clip, pattern: Pattern, tick: number): number | null {
  if (tick < clip.startTick || tick >= clip.startTick + clip.lengthTicks) return null;
  return (tick - clip.startTick + clip.offsetTicks) % pattern.lengthTicks;
}

/**
 * Snaps the start to the grid and the length to at least one grid step. Drum
 * hits are always one step, as in the step grid. A note that snaps onto the
 * pattern's end wraps to its start, which is what a loop-recording player hears.
 */
export function quantiseTake(open: OpenNote, endTick: number, clip: Clip, pattern: Pattern, snap: number): Note | null {
  const inPattern = toPatternTick(clip, pattern, open.startTick);
  if (inPattern === null) return null;
  const grid = snap > 0 ? snap : STEP_TICKS;
  let start = snapTicks(inPattern, grid);
  if (start >= pattern.lengthTicks) start = 0;
  const held = Math.max(0, endTick - open.startTick);
  let duration = pattern.kind === "drum" ? STEP_TICKS : Math.max(grid, snapTicks(held, grid));
  duration = Math.max(1, Math.min(duration, pattern.lengthTicks - start));
  return { id: newId(), pitch: open.pitch, start, duration, velocity: Math.min(1, Math.max(0.05, open.velocity)) };
}
