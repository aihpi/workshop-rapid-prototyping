import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Viewport width of the scroll container, updated by ResizeObserver. */
export function useViewportWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Runs `draw(scrollLeft)` now, on every scroll (coalesced to one call per
 * frame), and whenever `deps` change. Scroll never enters React state.
 */
export function useRedraw(ref: RefObject<HTMLElement | null>, draw: (scrollLeft: number) => void, deps: readonly unknown[]): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const run = () => {
      frame = 0;
      draw(el.scrollLeft);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    run();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}
