import { snapTicks } from "@hpi/shared";
import type { MixAutomationParam } from "@hpi/shared";

// Every pixel/tick conversion in the timeline lives here, so zoom never leaks
// into gesture code and the maths can be tested without a DOM.

export const HEADER_W = 168;
export const RULER_H = 40;
export const ROW_H = 64;
/** An open automation lane adds this much under its track. */
export const LANE_H = 56;
export const CLIP_PAD = 6;
export const RESIZE_HANDLE_W = 10;
/** Pointer travel before a press becomes a drag rather than a click. */
export const DRAG_THRESHOLD_PX = 3;
/** The loop brace's band in the ruler, and its square handles. */
export const LOOP_Y = 20;
export const LOOP_H = 8;
export const LOOP_HANDLE = 7;

export type Row = { trackId: string; top: number; height: number; lane: MixAutomationParam | null };

/** Rows are no longer uniform once a lane is open, so every y lookup goes through this. */
export function rowLayout(trackOrder: readonly string[], lanes: Readonly<Record<string, MixAutomationParam>>): Row[] {
  let top = 0;
  return trackOrder.map((trackId) => {
    const lane = lanes[trackId] ?? null;
    const height = ROW_H + (lane ? LANE_H : 0);
    const row = { trackId, top, height, lane };
    top += height;
    return row;
  });
}

export const layoutHeight = (rows: readonly Row[]): number => Math.max(ROW_H, rows.reduce((h, r) => h + r.height, 0));

/** The track row under y, and whether the point is in its clip area rather than its lane. */
export function rowAtY(y: number, rows: readonly Row[]): { row: Row; inClips: boolean } | null {
  const row = rows.find((r) => y >= r.top && y < r.top + r.height);
  return row ? { row, inClips: y < row.top + ROW_H } : null;
}

/** Which loop handle a ruler press lands on, if any. */
export function loopHandleAt(x: number, y: number, startPx: number, endPx: number): "start" | "end" | null {
  if (y < LOOP_Y - 3 || y > LOOP_Y + LOOP_H + 3) return null;
  const near = LOOP_HANDLE + 2;
  if (Math.abs(x - endPx) <= near) return "end";
  if (Math.abs(x - startPx) <= near) return "start";
  return null;
}

/** Vertical position of a lane value, 0 at the top of the lane. */
export const valueToLaneY = (value: number, min: number, max: number, laneH: number): number => ((max - value) / (max - min)) * laneH;
export const laneYToValue = (y: number, min: number, max: number, laneH: number): number =>
  Math.min(max, Math.max(min, max - (y / laneH) * (max - min)));

export const tickToPx = (tick: number, pxPerBar: number, ticksPerBar: number): number =>
  (tick / ticksPerBar) * pxPerBar;

export const pxToTick = (px: number, pxPerBar: number, ticksPerBar: number): number =>
  (px / pxPerBar) * ticksPerBar;

/**
 * How many bars the scrollable content spans: the song plus room to grow, and
 * never less than fills the viewport, so the grid always reaches the right edge.
 */
export function contentBars(songEndTick: number, ticksPerBar: number, pxPerBar: number, viewportPx: number): number {
  const songBars = Math.ceil(songEndTick / ticksPerBar);
  const viewportBars = Math.ceil(viewportPx / pxPerBar);
  return Math.max(songBars + 8, viewportBars + 1);
}

/** First and last bar index (inclusive) that intersect the viewport. */
export function visibleBarRange(scrollLeft: number, viewportPx: number, pxPerBar: number): [number, number] {
  const first = Math.max(0, Math.floor(scrollLeft / pxPerBar));
  const last = Math.floor((scrollLeft + viewportPx) / pxPerBar);
  return [first, last];
}

/** Which beat subdivisions are worth drawing at this zoom. */
export function gridDensity(pxPerBar: number): { beats: boolean; sixteenths: boolean; labelEvery: number } {
  return {
    beats: pxPerBar >= 48,
    sixteenths: pxPerBar >= 220,
    labelEvery: pxPerBar >= 40 ? 1 : pxPerBar >= 20 ? 2 : 4,
  };
}

type Zoom = { pxPerBar: number; ticksPerBar: number; snap: number };

/** Where a dragged clip lands: snapped, never before the start of the song. */
export function dragTargetTick(originTick: number, dxPx: number, zoom: Zoom): number {
  const raw = originTick + pxToTick(dxPx, zoom.pxPerBar, zoom.ticksPerBar);
  return Math.max(0, zoom.snap > 0 ? snapTicks(raw, zoom.snap) : Math.round(raw));
}

/** New clip length from a right-edge drag: snapped, never shorter than one grid step. */
export function resizeTargetTicks(originLength: number, dxPx: number, zoom: Zoom): number {
  const raw = originLength + pxToTick(dxPx, zoom.pxPerBar, zoom.ticksPerBar);
  const min = zoom.snap > 0 ? zoom.snap : 1;
  return Math.max(min, zoom.snap > 0 ? snapTicks(raw, zoom.snap) : Math.round(raw));
}

/** Snap a click position to the grid line at or before it. */
export function floorToGrid(tick: number, grid: number): number {
  return Math.max(0, Math.floor(tick / grid) * grid);
}

/**
 * Page-turn follow: when the playhead passes 85% of the viewport, jump the view
 * so the playhead sits at 10%. Returns the new scrollLeft, or null to leave it.
 */
export function followScroll(playheadPx: number, scrollLeft: number, viewportPx: number): number | null {
  const rightEdge = scrollLeft + viewportPx * 0.85;
  if (playheadPx > rightEdge || playheadPx < scrollLeft) {
    return Math.max(0, playheadPx - viewportPx * 0.1);
  }
  return null;
}
