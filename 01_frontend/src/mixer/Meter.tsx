import { useEffect, useRef } from "react";

import { meterFraction, subscribeMeter } from "../audio/index.ts";

/**
 * A level meter that never renders. It subscribes to the shared meter loop and
 * writes a transform to its own fill, the same way the playhead does. Above
 * 0 dBFS the fill goes ink, which is the only warning a paper page needs.
 */
export function Meter({ meterKey }: { meterKey: string }) {
  const fill = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      subscribeMeter(meterKey, (db) => {
        const el = fill.current;
        if (!el) return;
        el.style.transform = `scaleY(${meterFraction(db)})`;
        el.classList.toggle("hot", db > 0);
      }),
    [meterKey],
  );
  return (
    <div className="meter" aria-hidden="true">
      <div ref={fill} className="meter-fill" />
    </div>
  );
}
