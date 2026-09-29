import type { AutomationLane, AutomationPoint, Mix, MixAutomationParam } from "./song.ts";

/**
 * Pure helpers for automation lanes. The audio layer schedules ramps from
 * them, the timeline draws them, and both need the same answer to "what is
 * the value at this tick". A lane holds its first value before its first
 * point and its last value after its last point; in between it is linear.
 */
export const AUTOMATION_RANGES: Record<MixAutomationParam, { label: string; min: number; max: number; unit?: string }> = {
  volume: { label: "Volume", min: -60, max: 6, unit: "dB" },
  pan: { label: "Pan", min: -1, max: 1 },
  sendReverb: { label: "Reverb send", min: 0, max: 1 },
  sendDelay: { label: "Delay send", min: 0, max: 1 },
};

/** The fader value a lane replaces while it has points. */
export function mixValueFor(mix: Mix, param: MixAutomationParam): number {
  switch (param) {
    case "volume":
      return mix.volume;
    case "pan":
      return mix.pan;
    case "sendReverb":
      return mix.sends.reverb;
    case "sendDelay":
      return mix.sends.delay;
  }
}

export const laneIsActive = (lane: AutomationLane | undefined): lane is AutomationLane => lane !== undefined && lane.points.length > 0;

export function automationValueAt(lane: AutomationLane, tick: number): number | undefined {
  const points = lane.points;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return undefined;
  if (tick <= first.tick) return first.value;
  if (tick >= last.tick) return last.value;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (tick < b.tick) {
      const t = (tick - a.tick) / (b.tick - a.tick);
      return a.value + (b.value - a.value) * t;
    }
  }
  return last.value;
}

/**
 * Where the lane stands at `fromTick` and which points still lie ahead, so the
 * engine can start playback mid-song and ramp through the rest.
 */
export function automationFrom(lane: AutomationLane, fromTick: number): { start: number; points: AutomationPoint[] } | undefined {
  const start = automationValueAt(lane, fromTick);
  if (start === undefined) return undefined;
  return { start, points: lane.points.filter((p) => p.tick > fromTick) };
}
