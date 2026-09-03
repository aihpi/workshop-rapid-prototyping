import { ticksPerBar } from "@hpi/shared";
import type { Clip, Pattern } from "@hpi/shared";
import { describe, expect, it } from "vitest";

import { clipWindow, patternEvents } from "./schedule.ts";

const BAR = ticksPerBar([4, 4]);

const pattern: Pattern = {
  id: "p",
  name: "P",
  kind: "drum",
  lengthTicks: BAR,
  notes: [
    { id: "a", start: 0, duration: 48, pitch: 36, velocity: 1 },
    { id: "b", start: 384, duration: 48, pitch: 38, velocity: 0.8 },
    { id: "c", start: BAR, duration: 48, pitch: 42, velocity: 1 }, // exactly at the end: excluded
    { id: "d", start: BAR + 10, duration: 48, pitch: 42, velocity: 1 }, // past the end: excluded
  ],
};

describe("patternEvents", () => {
  it("emits pattern-relative tick times and drops notes outside the pattern", () => {
    const events = patternEvents(pattern);
    expect(events.map((e) => e.time)).toEqual(["0i", "384i"]);
    expect(events[1]).toMatchObject({ pitch: 38, velocity: 0.8, durationTicks: 48 });
  });
});

describe("clipWindow", () => {
  const clip: Clip = { id: "c", trackId: "t", patternId: "p", startTick: 2 * BAR, lengthTicks: 3 * BAR, offsetTicks: 0 };

  it("places the loop on the timeline and stops at the clip end", () => {
    expect(clipWindow(clip, pattern)).toEqual({ startTick: 2 * BAR, stopTick: 5 * BAR, offsetTicks: 0, loopEndTicks: BAR });
  });

  it("wraps an offset longer than the pattern", () => {
    expect(clipWindow({ ...clip, offsetTicks: BAR + 96 }, pattern).offsetTicks).toBe(96);
  });
});
