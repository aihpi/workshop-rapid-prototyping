import type { Section, TimeSig } from "@hpi/shared";
import { ticksPerBar } from "@hpi/shared";

import { gridDensity, RULER_H, ROW_H, tickToPx, visibleBarRange } from "./geometry.ts";
import { resolveSwatch } from "./swatch.ts";

/**
 * The two canvases behind the DOM. Both are sized to the viewport and take the
 * scroll offset as an argument, so they redraw cheaply on scroll and never
 * grow with the song. Colours come in as a palette resolved from the
 * stylesheet by the caller.
 */
export type Palette = {
  bg: string;
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

export function drawRuler(canvas: HTMLCanvasElement, view: View, sections: readonly Section[], palette: Palette): void {
  const ctx = prepare(canvas, view.width, RULER_H, view.dpr);
  const tpb = ticksPerBar(view.timeSig);
  const { pxPerBar, scrollLeft, width } = view;
  const density = gridDensity(pxPerBar);

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, RULER_H);

  // Sections as bands across the top half.
  const bandH = 16;
  ctx.font = `500 11px ${palette.font}`;
  ctx.textBaseline = "middle";
  for (const section of sections) {
    const x0 = tickToPx(section.startTick, pxPerBar, tpb) - scrollLeft;
    const x1 = tickToPx(section.endTick, pxPerBar, tpb) - scrollLeft;
    if (x1 < 0 || x0 > width) continue;
    ctx.fillStyle = resolveSwatch(section.colour);
    ctx.fillRect(x0, 4, Math.max(2, x1 - x0 - 2), bandH);
    if (x1 - x0 > 28) {
      ctx.fillStyle = palette.bg;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 6, 4, x1 - x0 - 14, bandH);
      ctx.clip();
      ctx.fillText(section.name, Math.max(x0 + 6, 6), 4 + bandH / 2);
      ctx.restore();
    }
  }

  // Bar numbers and ticks along the bottom half.
  const [first, last] = visibleBarRange(scrollLeft, width, pxPerBar);
  ctx.font = `11px ${palette.font}`;
  ctx.textBaseline = "alphabetic";
  for (let bar = first; bar <= last; bar++) {
    const x = bar * pxPerBar - scrollLeft;
    ctx.fillStyle = palette.lineStrong;
    ctx.fillRect(Math.round(x), RULER_H - 12, 1, 12);
    if (bar % density.labelEvery === 0) {
      ctx.fillStyle = palette.text;
      ctx.fillText(String(bar + 1), Math.round(x) + 4, RULER_H - 4);
    }
    if (density.beats) {
      const beats = view.timeSig[0];
      for (let beat = 1; beat < beats; beat++) {
        const bx = x + (beat / beats) * pxPerBar;
        ctx.fillStyle = palette.line;
        ctx.fillRect(Math.round(bx), RULER_H - 6, 1, 6);
      }
    }
  }
  ctx.fillStyle = palette.lineStrong;
  ctx.fillRect(0, RULER_H - 1, width, 1);
}

export function drawGrid(canvas: HTMLCanvasElement, view: View, rows: number, palette: Palette): void {
  const height = Math.max(rows * ROW_H, 1);
  const ctx = prepare(canvas, view.width, height, view.dpr);
  const { pxPerBar, scrollLeft, width } = view;
  const density = gridDensity(pxPerBar);
  const beats = view.timeSig[0];

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

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
      const per = beats * 4;
      for (let s = 1; s < per; s++) {
        if (s % 4 === 0) continue;
        ctx.fillStyle = palette.line;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(Math.round(x + (s / per) * pxPerBar), 0, 1, height);
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.fillStyle = palette.line;
  for (let row = 1; row <= rows; row++) ctx.fillRect(0, row * ROW_H - 1, width, 1);
}
