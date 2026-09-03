import { snapTicks } from "@hpi/shared";

// Every pixel/tick conversion in the timeline lives here, so zoom never leaks
// into gesture code and the maths can be tested without a DOM.

export const HEADER_W = 168;
export const RULER_H = 40;
export const ROW_H = 64;
export const CLIP_PAD = 6;
export const RESIZE_HANDLE_W = 10;
/** Pointer travel before a press becomes a drag rather than a click. */
export const DRAG_THRESHOLD_PX = 3;

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

export function rowAt(y: number, rowCount: number): number | null {
  const row = Math.floor(y / ROW_H);
  return row >= 0 && row < rowCount ? row : null;
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
