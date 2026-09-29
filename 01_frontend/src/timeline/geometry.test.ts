import { describe, expect, it } from "vitest";

import {
  contentBars,
  dragTargetTick,
  floorToGrid,
  followScroll,
  gridDensity,
  LANE_H,
  laneYToValue,
  layoutHeight,
  loopHandleAt,
  LOOP_Y,
  pxToTick,
  resizeTargetTicks,
  ROW_H,
  rowAtY,
  rowLayout,
  tickToPx,
  valueToLaneY,
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
});

describe("row layout with automation lanes", () => {
  const rows = rowLayout(["a", "b", "c"], { b: "volume" });

  it("stacks rows and makes the one with an open lane taller", () => {
    expect(rows.map((r) => [r.top, r.height])).toEqual([
      [0, ROW_H],
      [ROW_H, ROW_H + LANE_H],
      [2 * ROW_H + LANE_H, ROW_H],
    ]);
    expect(layoutHeight(rows)).toBe(3 * ROW_H + LANE_H);
    expect(layoutHeight([])).toBe(ROW_H);
  });

  it("finds the row under y and tells clip area from lane", () => {
    expect(rowAtY(ROW_H + 10, rows)).toEqual({ row: rows[1], inClips: true });
    expect(rowAtY(2 * ROW_H + 10, rows)).toEqual({ row: rows[1], inClips: false });
    expect(rowAtY(999, rows)).toBeNull();
  });

  it("maps lane values to pixels and back", () => {
    expect(valueToLaneY(6, -60, 6, LANE_H)).toBe(0);
    expect(valueToLaneY(-60, -60, 6, LANE_H)).toBe(LANE_H);
    expect(laneYToValue(LANE_H / 2, -1, 1, LANE_H)).toBe(0);
    expect(laneYToValue(-50, 0, 1, LANE_H)).toBe(1);
  });
});

describe("loop handles", () => {
  it("hits a handle only within its band, end wins when they overlap", () => {
    expect(loopHandleAt(100, LOOP_Y + 2, 100, 300)).toBe("start");
    expect(loopHandleAt(298, LOOP_Y + 2, 100, 300)).toBe("end");
    expect(loopHandleAt(200, LOOP_Y + 2, 100, 300)).toBeNull();
    expect(loopHandleAt(100, 2, 100, 300)).toBeNull();
    expect(loopHandleAt(104, LOOP_Y, 100, 108)).toBe("end");
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
