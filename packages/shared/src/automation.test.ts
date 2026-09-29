import { describe, expect, it } from "vitest";

import { automationFrom, automationValueAt, laneIsActive, mixValueFor } from "./automation.ts";
import { defaultMix } from "./factory.ts";

const lane = { points: [{ tick: 100, value: -20 }, { tick: 300, value: 0 }] };

describe("automationValueAt", () => {
  it("holds the first value before the first point and the last after the last", () => {
    expect(automationValueAt(lane, 0)).toBe(-20);
    expect(automationValueAt(lane, 100)).toBe(-20);
    expect(automationValueAt(lane, 300)).toBe(0);
    expect(automationValueAt(lane, 999)).toBe(0);
  });

  it("interpolates linearly between points", () => {
    expect(automationValueAt(lane, 200)).toBe(-10);
    expect(automationValueAt(lane, 150)).toBe(-15);
  });

  it("is undefined for an empty lane", () => {
    expect(automationValueAt({ points: [] }, 10)).toBeUndefined();
    expect(laneIsActive({ points: [] })).toBe(false);
    expect(laneIsActive(undefined)).toBe(false);
  });
});

describe("automationFrom", () => {
  it("starts mid-segment and keeps only the points ahead", () => {
    expect(automationFrom(lane, 200)).toEqual({ start: -10, points: [{ tick: 300, value: 0 }] });
    expect(automationFrom(lane, 300)).toEqual({ start: 0, points: [] });
  });
});

describe("mixValueFor", () => {
  it("reads the fader value each lane replaces", () => {
    const mix = { ...defaultMix(), volume: -6, pan: 0.5, sends: { reverb: 0.2, delay: 0.7 } };
    expect(mixValueFor(mix, "volume")).toBe(-6);
    expect(mixValueFor(mix, "pan")).toBe(0.5);
    expect(mixValueFor(mix, "sendReverb")).toBe(0.2);
    expect(mixValueFor(mix, "sendDelay")).toBe(0.7);
  });
});
