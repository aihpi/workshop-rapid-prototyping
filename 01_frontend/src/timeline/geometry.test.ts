import { describe, expect, it } from "vitest";

import {
  contentBars,
  dragTargetTick,
  floorToGrid,
  followScroll,
  gridDensity,
  pxToTick,
  resizeTargetTicks,
  rowAt,
  tickToPx,
  visibleBarRange,
} from "./geometry.ts";

const TPB = 768;
const zoom = { pxPerBar: 96, ticksPerBar: TPB, snap: 192 };

describe("conversions", () => {
  it("ticks and pixels round-trip", () => {
    expect(tickToPx(TPB, 96, TPB)).toBe(96);
    expect(pxToTick(tickToPx(1000, 96, TPB), 96, TPB)).toBeCloseTo(1000);
  });
});

describe("content and viewport", () => {
  it("leaves eight bars of room after the song", () => {
    expect(contentBars(16 * TPB, TPB, 96, 500)).toBe(24);
  });

  it("never leaves the grid short of the viewport", () => {
    expect(contentBars(0, TPB, 96, 2000)).toBe(22);
  });

  it("reports the bars intersecting the viewport", () => {
    expect(visibleBarRange(0, 960, 96)).toEqual([0, 10]);
    expect(visibleBarRange(150, 960, 96)).toEqual([1, 11]);
  });

  it("thins the grid out as you zoom out", () => {
    expect(gridDensity(400)).toEqual({ beats: true, sixteenths: true, labelEvery: 1 });
    expect(gridDensity(96)).toEqual({ beats: true, sixteenths: false, labelEvery: 1 });
    expect(gridDensity(16)).toEqual({ beats: false, sixteenths: false, labelEvery: 4 });
  });

  it("maps y to a track row and rejects the void below", () => {
    expect(rowAt(10, 3)).toBe(0);
    expect(rowAt(130, 3)).toBe(2);
    expect(rowAt(300, 3)).toBeNull();
    expect(rowAt(-1, 3)).toBeNull();
  });
});

describe("gestures", () => {
  it("drag snaps to the grid and clamps at zero", () => {
    // 96 px per bar, snap to a beat (192 ticks = 24 px). 30 px right of tick 0 snaps to one beat.
    expect(dragTargetTick(0, 30, zoom)).toBe(192);
    expect(dragTargetTick(0, 11, zoom)).toBe(0);
    expect(dragTargetTick(192, -500, zoom)).toBe(0);
  });

  it("drag without snap moves freely", () => {
    expect(dragTargetTick(0, 10, { ...zoom, snap: 0 })).toBe(80);
  });

  it("resize snaps and never goes below one step", () => {
    expect(resizeTargetTicks(TPB, 30, zoom)).toBe(TPB + 192);
    expect(resizeTargetTicks(TPB, -5000, zoom)).toBe(192);
  });

  it("floor to grid finds the line at or before a click", () => {
    expect(floorToGrid(200, 192)).toBe(192);
    expect(floorToGrid(191, 192)).toBe(0);
  });
});

describe("follow", () => {
  it("does nothing while the playhead is comfortably in view", () => {
    expect(followScroll(400, 0, 1000)).toBeNull();
  });

  it("turns the page when the playhead nears the right edge", () => {
    expect(followScroll(900, 0, 1000)).toBe(800);
  });

  it("jumps back if the playhead is behind the view", () => {
    expect(followScroll(100, 500, 1000)).toBe(0);
  });
});
