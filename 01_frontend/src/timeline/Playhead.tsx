import { ticksPerBar } from "@hpi/shared";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { subscribePlayhead } from "../audio/index.ts";
import { useSongStore, useUiStore } from "../state/index.ts";
import { followScroll, HEADER_W, tickToPx } from "./geometry.ts";

type Props = { scrollerRef: RefObject<HTMLDivElement | null>; height: number };

/**
 * The moving line. Written straight to the DOM from the transport clock;
 * this component renders once per zoom change and never for position.
 * While playing, it also turns the page when it nears the right edge.
 */
export function Playhead({ scrollerRef, height }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pxPerBar = useUiStore((s) => s.pxPerBar);
  const tpb = useSongStore((s) => ticksPerBar(s.doc.meta.timeSig));

  useEffect(() => {
    return subscribePlayhead((ticks) => {
      const el = ref.current;
      if (!el) return;
      const px = tickToPx(ticks, pxPerBar, tpb);
      el.style.transform = `translate3d(${px}px, 0, 0)`;

      const scroller = scrollerRef.current;
      if (!scroller || !useUiStore.getState().isPlaying) return;
      const viewport = scroller.clientWidth - HEADER_W;
      const next = followScroll(px, scroller.scrollLeft, viewport);
      if (next !== null) scroller.scrollLeft = next;
    });
  }, [pxPerBar, tpb, scrollerRef]);

  return <div ref={ref} className="playhead" style={{ height }} />;
}
