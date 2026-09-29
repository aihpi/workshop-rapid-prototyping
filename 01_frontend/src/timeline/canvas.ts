import type { Section, TimeSig } from "@hpi/shared";
import { STEP_TICKS, ticksPerBar } from "@hpi/shared";

import type { LoopRegion } from "../state/index.ts";
import { gridDensity, LOOP_H, LOOP_HANDLE, LOOP_Y, RULER_H, ROW_H, tickToPx, visibleBarRange } from "./geometry.ts";
import type { Row } from "./geometry.ts";
import { resolveSwatch } from "./swatch.ts";

/**
 * The two canvases behind the DOM. Both are sized to the viewport and take the
 * scroll offset as an argument, so they redraw cheaply on scroll and never
 * grow with the song. Colours come in as a palette resolved from the
 * stylesheet by the caller.
 */
export type Palette = {
  bg: string;
  bgLane: string;
  line: string;
  lineStrong: string;
  text: string;
  textMuted: string;
  font: string;
};

type View = {
  scrollLeft: number;
  width: number;
  pxPerBar: number;
  timeSig: TimeSig;
  dpr: number;
};

function prepare(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): CanvasRenderingContext2D {
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function drawRuler(canvas: HTMLCanvasElement, view: View, sections: readonly Section[], loop: LoopRegion, palette: Palette): void {
  const ctx = prepare(canvas, view.width, RULER_H, view.dpr);
  const tpb = ticksPerBar(view.timeSig);
  const { pxPerBar, scrollLeft, width } = view;
  const density = gridDensity(pxPerBar);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, RULER_H);

  // Sections: a swatch underline and an ink name, not a filled band. Ink on
  // white reads at any tint; white on a 25 % tint does not.
  ctx.font = `500 11px ${palette.font}`;
  ctx.textBaseline = "alphabetic";
  for (const section of sections) {
    const x0 = tickToPx(section.startTick, pxPerBar, tpb) - scrollLeft;
    const x1 = tickToPx(section.endTick, pxPerBar, tpb) - scrollLeft;
    if (x1 < 0 || x0 > width) continue;
    ctx.fillStyle = resolveSwatch(section.colour);
    ctx.fillRect(x0, 2, Math.max(2, x1 - x0 - 2), 3);
    if (x1 - x0 > 28) {
      ctx.fillStyle = palette.text;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 4, 5, x1 - x0 - 10, 14);
      ctx.clip();
      ctx.fillText(section.name, Math.max(x0 + 4, 4), 16);
      ctx.restore();
    }
  }

  // The loop brace: ink while looping, grey while the region is only remembered.
  if (loop.endTick > loop.startTick + 1) {
    const x0 = tickToPx(loop.startTick, pxPerBar, tpb) - scrollLeft;
    const x1 = tickToPx(loop.endTick, pxPerBar, tpb) - scrollLeft;
    if (x1 >= 0 && x0 <= width) {
      ctx.fillStyle = loop.enabled ? palette.text : palette.lineStrong;
      const mid = LOOP_Y + LOOP_H / 2;
      ctx.fillRect(x0, mid - 1, x1 - x0, 2);
      ctx.fillRect(x0, LOOP_Y, LOOP_HANDLE, LOOP_H);
      ctx.fillRect(x1 - LOOP_HANDLE, LOOP_Y, LOOP_HANDLE, LOOP_H);
    }
  }

  // Bar numbers and ticks along the bottom.
  const [first, last] = visibleBarRange(scrollLeft, width, pxPerBar);
  ctx.font = `11px ${palette.font}`;
  for (let bar = first; bar <= last; bar++) {
    const x = bar * pxPerBar - scrollLeft;
    ctx.fillStyle = palette.lineStrong;
    ctx.fillRect(Math.round(x), RULER_H - 10, 1, 10);
    if (bar % density.labelEvery === 0) {
      ctx.fillStyle = palette.textMuted;
      ctx.fillText(String(bar + 1), Math.round(x) + 4, RULER_H - 3);
    }
    if (density.beats) {
      const beats = view.timeSig[0];
      for (let beat = 1; beat < beats; beat++) {
        const bx = x + (beat / beats) * pxPerBar;
        ctx.fillStyle = palette.line;
        ctx.fillRect(Math.round(bx), RULER_H - 5, 1, 5);
      }
    }
  }
  ctx.fillStyle = palette.lineStrong;
  ctx.fillRect(0, RULER_H - 1, width, 1);
}

export function drawGrid(canvas: HTMLCanvasElement, view: View, rows: readonly Row[], height: number, palette: Palette): void {
  const ctx = prepare(canvas, view.width, height, view.dpr);
  const { pxPerBar, scrollLeft, width } = view;
  const density = gridDensity(pxPerBar);
  const beats = view.timeSig[0];

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);
  for (const row of rows) {
    if (row.lane) {
      ctx.fillStyle = palette.bgLane;
      ctx.fillRect(0, row.top + ROW_H, width, row.height - ROW_H);
    }
  }

  // Every line at full alpha: a translucent hairline vanishes on white.
  const [first, last] = visibleBarRange(scrollLeft, width, pxPerBar);
  for (let bar = first; bar <= last; bar++) {
    const x = bar * pxPerBar - scrollLeft;
    ctx.fillStyle = palette.lineStrong;
    ctx.fillRect(Math.round(x), 0, 1, height);
    if (density.beats) {
      for (let beat = 1; beat < beats; beat++) {
        ctx.fillStyle = palette.line;
        ctx.fillRect(Math.round(x + (beat / beats) * pxPerBar), 0, 1, height);
      }
    }
    if (density.sixteenths) {
      // Sixteenths per bar from the tick count, so 6/8 gets 12, not 24.
      const per = ticksPerBar(view.timeSig) / STEP_TICKS;
      const perBeat = per / beats;
      for (let s = 1; s < per; s++) {
        if (s % perBeat === 0) continue;
        ctx.fillStyle = palette.line;
        ctx.fillRect(Math.round(x + (s / per) * pxPerBar), 0, 1, height);
      }
    }
  }

  ctx.fillStyle = palette.line;
  for (const row of rows) {
    if (row.lane) ctx.fillRect(0, row.top + ROW_H - 1, width, 1);
    ctx.fillRect(0, row.top + row.height - 1, width, 1);
  }
}
