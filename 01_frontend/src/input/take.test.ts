import { STEP_TICKS, ticksPerBar } from "@hpi/shared";
import type { Clip, Pattern } from "@hpi/shared";
import { describe, expect, it } from "vitest";

import { quantiseTake, toPatternTick } from "./take.ts";

const BAR = ticksPerBar([4, 4]);
const pattern: Pattern = { id: "p", name: "P", kind: "pitched", lengthTicks: BAR, notes: [] };
const drums: Pattern = { ...pattern, kind: "drum" };
const clip: Clip = { id: "c", trackId: "t", patternId: "p", startTick: 2 * BAR, lengthTicks: 4 * BAR, offsetTicks: 0 };

describe("toPatternTick", () => {
  it("is relative to the clip and wraps with the pattern", () => {
    expect(toPatternTick(clip, pattern, 2 * BAR)).toBe(0);
    expect(toPatternTick(clip, pattern, 3 * BAR + 10)).toBe(10);
  });

  it("is null outside the clip", () => {
    expect(toPatternTick(clip, pattern, BAR)).toBeNull();
    expect(toPatternTick(clip, pattern, 6 * BAR)).toBeNull();
  });
});

describe("quantiseTake", () => {
  it("snaps the start and rounds the held length up to a grid step", () => {
    const note = quantiseTake({ pitch: 60, velocity: 0.8, startTick: 2 * BAR + STEP_TICKS + 5 }, 2 * BAR + STEP_TICKS + 5 + 20, clip, pattern, STEP_TICKS);
    expect(note).toMatchObject({ pitch: 60, start: STEP_TICKS, duration: STEP_TICKS, velocity: 0.8 });
  });

  it("a long hold becomes a long note, clamped at the pattern end", () => {
    const note = quantiseTake({ pitch: 60, velocity: 1, startTick: 2 * BAR + BAR / 2 }, 2 * BAR + 3 * BAR, clip, pattern, STEP_TICKS);
    expect(note?.duration).toBe(BAR / 2);
  });

  it("drum hits are one step whatever the hold", () => {
    const note = quantiseTake({ pitch: 36, velocity: 1, startTick: 2 * BAR }, 2 * BAR + BAR, clip, drums, STEP_TICKS);
    expect(note?.duration).toBe(STEP_TICKS);
  });

  it("a start that snaps onto the pattern end wraps to the first step", () => {
    const note = quantiseTake({ pitch: 60, velocity: 1, startTick: 3 * BAR - 3 }, 3 * BAR + STEP_TICKS, clip, pattern, STEP_TICKS);
    expect(note?.start).toBe(0);
  });

  it("is null when the key went down outside the clip", () => {
    expect(quantiseTake({ pitch: 60, velocity: 1, startTick: 0 }, STEP_TICKS, clip, pattern, STEP_TICKS)).toBeNull();
  });
});
