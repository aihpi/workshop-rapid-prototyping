import { ticksPerBar } from "@hpi/shared";
import { useCallback, useRef } from "react";
import type { RefObject } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import { actions } from "./actions.ts";
import { drawGrid, drawRuler } from "./canvas.ts";
import type { Palette } from "./canvas.ts";
import { HEADER_W, pxToTick, RULER_H } from "./geometry.ts";
import { cssVar } from "./swatch.ts";
import { useRedraw } from "./useScroller.ts";

type Props = { scrollerRef: RefObject<HTMLDivElement | null>; viewportW: number };

const palette = (): Palette => ({
  bg: cssVar("--bg-lanes"),
  line: cssVar("--grid-line"),
  lineStrong: cssVar("--grid-line-strong"),
  text: cssVar("--fg"),
  textMuted: cssVar("--fg-muted"),
  font: cssVar("--font"),
});

/** Bar numbers and section bands. Click seeks; double-click on a band renames it. */
export function Ruler({ scrollerRef, viewportW }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sections = useSongStore((s) => s.doc.sections);
  const timeSig = useSongStore((s) => s.doc.meta.timeSig);
  const pxPerBar = useUiStore((s) => s.pxPerBar);

  useRedraw(
    scrollerRef,
    (scrollLeft) => {
      if (canvasRef.current) {
        drawRuler(canvasRef.current, { scrollLeft, width: viewportW, pxPerBar, timeSig, dpr: window.devicePixelRatio || 1 }, sections, palette());
      }
    },
    [viewportW, pxPerBar, timeSig, sections],
  );

  const tickAt = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      const scroller = scrollerRef.current;
      if (!canvas || !scroller) return 0;
      const x = clientX - canvas.getBoundingClientRect().left + scroller.scrollLeft;
      return pxToTick(x, pxPerBar, ticksPerBar(timeSig));
    },
    [pxPerBar, timeSig, scrollerRef],
  );

  return (
    <canvas
      ref={canvasRef}
      className="ruler-canvas"
      style={{ left: HEADER_W, height: RULER_H }}
      onClick={(e) => actions.seek(tickAt(e.clientX))}
      onDoubleClick={(e) => {
        const tick = tickAt(e.clientX);
        const hit = sections.find((s) => tick >= s.startTick && tick < s.endTick);
        if (!hit || e.nativeEvent.offsetY > 22) return;
        const name = window.prompt("Section name", hit.name);
        if (name && name !== hit.name) actions.renameSection(hit.id, name);
      }}
    />
  );
}

/** Bar and beat lines behind the clips. */
export function Grid({ scrollerRef, viewportW }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = useSongStore((s) => s.doc.trackOrder.length);
  const timeSig = useSongStore((s) => s.doc.meta.timeSig);
  const pxPerBar = useUiStore((s) => s.pxPerBar);

  useRedraw(
    scrollerRef,
    (scrollLeft) => {
      if (canvasRef.current) {
        drawGrid(canvasRef.current, { scrollLeft, width: viewportW, pxPerBar, timeSig, dpr: window.devicePixelRatio || 1 }, rows, palette());
      }
    },
    [viewportW, pxPerBar, timeSig, rows],
  );

  return <canvas ref={canvasRef} className="grid-canvas" style={{ left: HEADER_W }} />;
}
