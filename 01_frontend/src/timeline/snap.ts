import { PPQ, STEP_TICKS, ticksPerBar, ticksPerBeat } from "@hpi/shared";
import type { TimeSig } from "@hpi/shared";

/**
 * The snap grid is stored by name and turned into ticks against the current
 * time signature, so "Beat" stays a beat when the song moves from 4/4 to 6/8.
 */
export type SnapName = "bar" | "beat" | "eighth" | "sixteenth" | "off";

export const SNAP_OPTIONS: readonly { name: SnapName; label: string }[] = [
  { name: "bar", label: "Bar" },
  { name: "beat", label: "Beat" },
  { name: "eighth", label: "1/8" },
  { name: "sixteenth", label: "1/16" },
  { name: "off", label: "Off" },
];

/** Ticks per grid step, 0 for no snapping. */
export function snapTicksFor(name: SnapName, timeSig: TimeSig): number {
  switch (name) {
    case "bar":
      return ticksPerBar(timeSig);
    case "beat":
      return ticksPerBeat(timeSig);
    case "eighth":
      return PPQ / 2;
    case "sixteenth":
      return STEP_TICKS;
    case "off":
      return 0;
  }
}
