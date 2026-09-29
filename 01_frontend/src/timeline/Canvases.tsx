import { snapTicks, ticksPerBar } from "@hpi/shared";
import { useCallback, useRef } from "react";
import type { RefObject } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import type { LoopRegion } from "../state/index.ts";
import { actions } from "./actions.ts";
import { drawGrid, drawRuler } from "./canvas.ts";
import type { Palette } from "./canvas.ts";
import { HEADER_W, loopHandleAt, pxToTick, RULER_H, tickToPx } from "./geometry.ts";
import type { Row } from "./geometry.ts";
import { snapTicksFor } from "./snap.ts";
import { cssVar } from "./swatch.ts";
import { useRedraw } from "./useScroller.ts";

type Props = { scrollerRef: RefObject<HTMLDivElement | null>; viewportW: number };

const palette = (): Palette => ({
  bg: cssVar("--bg-lanes"),
  bgLane: cssVar("--bg-sunken"),
  line: cssVar("--grid-line"),
  lineStrong: cssVar("--grid-line-strong"),
  text: cssVar("--fg"),
  textMuted: cssVar("--fg-muted"),
  font: cssVar("--font"),
});

/** A brace is only drawn, and only grabbable, once it spans something. */
const hasBrace = (loop: LoopRegion): boolean => loop.endTick > loop.startTick + 1;

/** Bar numbers, section names and the loop brace. Click seeks; double-click on a name renames; drag a brace handle to move it. */
export function Ruler({ scrollerRef, viewportW }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sections = useSongStore((s) => s.doc.sections);
  const timeSig = useSongStore((s) => s.doc.meta.timeSig);
  const pxPerBar = useUiStore((s) => s.pxPerBar);
  const loop = useUiStore((s) => s.loop);
  const snap = snapTicksFor(
    useUiStore((s) => s.snap),
    timeSig,
  );
  const dragged = useRef(false);

  const view = (scrollLeft: number) => ({ scrollLeft, width: viewportW, pxPerBar, timeSig, dpr: window.devicePixelRatio || 1 });
  useRedraw(
    scrollerRef,
    (scrollLeft) => {
      if (canvasRef.current) drawRuler(canvasRef.current, view(scrollLeft), sections, loop, palette());
    },
    [viewportW, pxPerBar, timeSig, sections, loop],
  );

  const tpb = ticksPerBar(timeSig);
  const tickAt = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      const scroller = scrollerRef.current;
      if (!canvas || !scroller) return 0;
      const x = clientX - canvas.getBoundingClientRect().left + scroller.scrollLeft;
      return pxToTick(x, pxPerBar, tpb);
    },
    [pxPerBar, tpb, scrollerRef],
  );

  /** Canvas during the drag, one `setLoop` on release. */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const scroller = scrollerRef.current;
    if (!canvas || !scroller || e.button !== 0) return;
    // Every press starts clean; only a handle drag sets this, and only its trailing click is swallowed.
    dragged.current = false;
    if (!hasBrace(loop)) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const handle = loopHandleAt(x, y, tickToPx(loop.startTick, pxPerBar, tpb) - scroller.scrollLeft, tickToPx(loop.endTick, pxPerBar, tpb) - scroller.scrollLeft);
    if (!handle) return;
    canvas.setPointerCapture(e.pointerId);
    let preview: LoopRegion = loop;
    const onMove = (ev: PointerEvent) => {
      dragged.current = true;
      const grid = ev.altKey ? 1 : snap || tpb;
      const tick = Math.max(0, snapTicks(tickAt(ev.clientX), grid));
      preview = handle === "start" ? { ...loop, startTick: Math.min(tick, loop.endTick - grid) } : { ...loop, endTick: Math.max(tick, loop.startTick + grid) };
      drawRuler(canvas, view(scroller.scrollLeft), sections, preview, palette());
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      if (preview !== loop) actions.setLoop(preview);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <canvas
      ref={canvasRef}
      className="ruler-canvas"
      style={{ left: HEADER_W, height: RULER_H }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if (dragged.current) return;
        actions.seek(tickAt(e.clientX));
      }}
      onDoubleClick={(e) => {
        const tick = tickAt(e.clientX);
        const hit = sections.find((s) => tick >= s.startTick && tick < s.endTick);
        if (!hit || e.nativeEvent.offsetY > 18) return;
        const name = window.prompt("Section name", hit.name);
        if (name && name !== hit.name) actions.renameSection(hit.id, name);
      }}
    />
  );
}

/** Bar and beat lines behind the clips, with a quieter ground under open automation lanes. */
export function Grid({ scrollerRef, viewportW, rows, height }: Props & { rows: readonly Row[]; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeSig = useSongStore((s) => s.doc.meta.timeSig);
  const pxPerBar = useUiStore((s) => s.pxPerBar);

  useRedraw(
    scrollerRef,
    (scrollLeft) => {
      if (canvasRef.current) {
        drawGrid(canvasRef.current, { scrollLeft, width: viewportW, pxPerBar, timeSig, dpr: window.devicePixelRatio || 1 }, rows, height, palette());
      }
    },
    [viewportW, pxPerBar, timeSig, rows, height],
  );

  return <canvas ref={canvasRef} className="grid-canvas" style={{ left: HEADER_W }} />;
}
