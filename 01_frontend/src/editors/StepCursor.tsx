import { useEffect, useRef } from "react";
import type { Clip, Pattern } from "@hpi/shared";

import { subscribePlayhead } from "../audio/index.ts";

type Props = { clip: Clip; pattern: Pattern; pxPerStep: number; stepTicks: number; height: number };

/**
 * The playing position inside the pattern being edited, written straight to
 * the DOM from the transport clock. Hidden while the playhead is outside the
 * clip that opened this editor.
 */
export function StepCursor({ clip, pattern, pxPerStep, stepTicks, height }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    return subscribePlayhead((ticks) => {
      const el = ref.current;
      if (!el) return;
      const inside = ticks >= clip.startTick && ticks < clip.startTick + clip.lengthTicks;
      if (!inside) {
        el.style.opacity = "0";
        return;
      }
      const local = (ticks - clip.startTick + clip.offsetTicks) % pattern.lengthTicks;
      el.style.opacity = "1";
      el.style.transform = `translate3d(${(local / stepTicks) * pxPerStep}px, 0, 0)`;
    });
  }, [clip, pattern, pxPerStep, stepTicks]);
  return <div ref={ref} className="step-cursor" style={{ height, opacity: 0 }} />;
}
