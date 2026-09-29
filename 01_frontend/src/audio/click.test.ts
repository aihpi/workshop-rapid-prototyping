import { describe, expect, it } from "vitest";

import { beatOf, beatSeconds, clickTimes } from "./click.ts";

describe("click timing", () => {
  it("a beat at 120 bpm in 4/4 is half a second, in 6/8 a quarter", () => {
    expect(beatSeconds([4, 4], 120)).toBeCloseTo(0.5);
    expect(beatSeconds([6, 8], 120)).toBeCloseTo(0.25);
  });

  it("a two-bar count-in in 3/4 has six clicks with the first of each bar accented", () => {
    const clicks = clickTimes(2, [3, 4], 60);
    expect(clicks).toHaveLength(6);
    expect(clicks.map((c) => c.accent)).toEqual([true, false, false, true, false, false]);
    expect(clicks[4]!.offsetSec).toBeCloseTo(4);
  });

  it("finds the beat in the bar and forgives a slightly early callback", () => {
    expect(beatOf(0, [4, 4])).toEqual({ beat: 0, accent: true });
    expect(beatOf(192 * 5 - 3, [4, 4])).toEqual({ beat: 1, accent: false });
    expect(beatOf(192 * 4, [4, 4]).accent).toBe(true);
  });
});
