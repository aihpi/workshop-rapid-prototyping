import type { Clip, TrackKind } from "@hpi/shared";

import { CLIP_PAD, DRAG_THRESHOLD_PX, dragTargetTick, resizeTargetTicks, tickToPx } from "./geometry.ts";
import type { ClipMove } from "./actions.ts";

/**
 * Pointer handling for clips, outside React.
 *
 * During the gesture nothing touches the store: the moving elements get a
 * transform, coalesced to one write per animation frame. On release there is
 * exactly one store write. Pointer Events with capture, not mouse events, not
 * HTML5 drag-and-drop, which has neither fine coordinates nor touch support.
 */
export type GestureEnv = {
  lanes: HTMLElement;
  pxPerBar: number;
  ticksPerBar: number;
  snap: number;
  trackOrder: readonly string[];
  trackKind: (trackId: string) => TrackKind | undefined;
  /** Pixel top of a track's row; rows differ in height once automation lanes open. */
  rowTop: (trackId: string) => number;
  /** The track whose row (clips or lane) contains a y inside `lanes`. */
  trackAtY: (y: number) => string | undefined;
  clip: (clipId: string) => Clip | undefined;
  /** Every clip that should move together with the pressed one. */
  group: (clipId: string) => readonly string[];
  onMove: (moves: ClipMove[]) => void;
  onResize: (clipId: string, lengthTicks: number) => void;
  onClick: (clipId: string, additive: boolean) => void;
};

const clipEl = (lanes: HTMLElement, id: string): HTMLElement | null =>
  lanes.querySelector<HTMLElement>(`[data-clip-id="${id}"]`);

/**
 * `captureEl` must be the element the React handler ran on (`e.currentTarget`
 * in React). The native event's own currentTarget is React's root container,
 * and capturing there routes pointerup, click and dblclick to the root instead
 * of the clip.
 */
export function startClipGesture(e: PointerEvent, captureEl: HTMLElement, clipId: string, mode: "move" | "resize", env: GestureEnv): void {
  const primary = env.clip(clipId);
  if (!primary) return;
  captureEl.setPointerCapture(e.pointerId);

  const zoom = { pxPerBar: env.pxPerBar, ticksPerBar: env.ticksPerBar, snap: env.snap };
  const startX = e.clientX;
  const startY = e.clientY;
  const lanesTop = env.lanes.getBoundingClientRect().top;
  const ids = mode === "move" ? env.group(clipId) : [clipId];
  const origins = ids.map((id) => env.clip(id)).filter((c): c is Clip => c !== undefined);
  const rowOf = (trackId: string) => env.trackOrder.indexOf(trackId);
  const elements = origins.map((c) => clipEl(env.lanes, c.id));
  // React owns these inline styles. Remember them so a cancelled or unchanged
  // gesture can put them back; blanking them would leave the clip at (0, 0)
  // until something else triggers a render.
  const originalStyles = elements.map((el) => ({ transform: el?.style.transform ?? "", width: el?.style.width ?? "" }));

  let dragging = false;
  let frame = 0;
  let deltaTicks = 0;
  let rowDelta = 0;
  let newLength = primary.lengthTicks;

  const paint = () => {
    frame = 0;
    if (mode === "resize") {
      const el = elements[0];
      if (el) el.style.width = `${tickToPx(newLength, env.pxPerBar, env.ticksPerBar) - 1}px`;
      return;
    }
    const dx = tickToPx(deltaTicks, env.pxPerBar, env.ticksPerBar);
    elements.forEach((el, i) => {
      if (!el) return;
      const origin = origins[i]!;
      const dest = env.trackOrder[rowOf(origin.trackId) + rowDelta] ?? origin.trackId;
      const x = tickToPx(origin.startTick + deltaTicks, env.pxPerBar, env.ticksPerBar);
      el.style.transform = `translate(${x}px, ${env.rowTop(dest) + CLIP_PAD}px)`;
    });
  };

  const rowDeltaAllowed = (delta: number): boolean =>
    origins.every((c) => {
      const row = rowOf(c.trackId) + delta;
      const dest = env.trackOrder[row];
      return dest !== undefined && env.trackKind(dest) === env.trackKind(c.trackId);
    });

  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    dragging = true;
    document.body.classList.add("dragging");

    if (mode === "resize") {
      newLength = resizeTargetTicks(primary.lengthTicks, dx, ev.altKey ? { ...zoom, snap: 0 } : zoom);
    } else {
      // Snap the pressed clip, then move the rest by the same delta so the
      // group keeps its internal offsets.
      const snappedPrimary = dragTargetTick(primary.startTick, dx, ev.altKey ? { ...zoom, snap: 0 } : zoom);
      deltaTicks = snappedPrimary - primary.startTick;
      const minStart = Math.min(...origins.map((c) => c.startTick));
      if (minStart + deltaTicks < 0) deltaTicks = -minStart;
      // Rows are not uniform once a lane is open, so ask the layout which track is under the pointer.
      const under = env.trackAtY(ev.clientY - lanesTop);
      const wanted = under === undefined ? 0 : rowOf(under) - rowOf(primary.trackId);
      rowDelta = rowDeltaAllowed(wanted) ? wanted : 0;
    }
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const finish = (commit: boolean) => {
    cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("keydown", onKey);
    document.body.classList.remove("dragging");
    elements.forEach((el, i) => {
      if (!el) return;
      el.style.transform = originalStyles[i]!.transform;
      el.style.width = originalStyles[i]!.width;
    });
    if (!commit) return;
    if (mode === "resize") {
      if (newLength !== primary.lengthTicks) env.onResize(clipId, newLength);
      return;
    }
    if (deltaTicks === 0 && rowDelta === 0) return;
    env.onMove(
      origins.map((c) => ({
        clipId: c.id,
        startTick: c.startTick + deltaTicks,
        ...(rowDelta !== 0 ? { trackId: env.trackOrder[rowOf(c.trackId) + rowDelta]! } : {}),
      })),
    );
  };

  const onUp = (ev: PointerEvent) => {
    if (dragging) finish(true);
    else {
      finish(false);
      env.onClick(clipId, ev.shiftKey || ev.metaKey || ev.ctrlKey);
    }
  };

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") finish(false);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
  window.addEventListener("keydown", onKey);
}
