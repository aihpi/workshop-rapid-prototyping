import type { Note } from "@hpi/shared";
import { snapTicks } from "@hpi/shared";

/**
 * Drag a note in the piano roll: body moves it in time and pitch, right edge
 * resizes it. Same discipline as clips: DOM during the gesture, one store
 * write on release, a plain click (no travel) is reported separately.
 */
export type NoteGestureEnv = {
  pxPerStep: number;
  stepTicks: number;
  rowH: number;
  /** Highest pitch shown, i.e. row 0. */
  topPitch: number;
  lowestPitch: number;
  onMove: (start: number, pitch: number) => void;
  onResize: (duration: number) => void;
  onClick: (shiftKey: boolean) => void;
};

const THRESHOLD = 3;

/** `el` is the note element itself; the caller resolves it from whatever was pressed. */
export function startNoteGesture(e: PointerEvent, el: HTMLElement, note: Note, mode: "move" | "resize", env: NoteGestureEnv): void {
  el.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startY = e.clientY;
  const original = { transform: el.style.transform, width: el.style.width };
  const ticksPerPx = env.stepTicks / env.pxPerStep;

  let dragging = false;
  let frame = 0;
  let start = note.start;
  let pitch = note.pitch;
  let duration = note.duration;

  const paint = () => {
    frame = 0;
    if (mode === "resize") {
      el.style.width = `${(duration / env.stepTicks) * env.pxPerStep - 1}px`;
    } else {
      const dx = ((start - note.start) / env.stepTicks) * env.pxPerStep;
      const dy = (note.pitch - pitch) * env.rowH;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };

  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) < THRESHOLD) return;
    dragging = true;
    const snap = ev.altKey ? 1 : env.stepTicks;
    if (mode === "resize") {
      duration = Math.max(snap, snapTicks(note.duration + dx * ticksPerPx, snap));
    } else {
      start = Math.max(0, snapTicks(note.start + dx * ticksPerPx, snap));
      pitch = Math.min(env.topPitch, Math.max(env.lowestPitch, note.pitch - Math.round(dy / env.rowH)));
    }
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const finish = (commit: boolean) => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("keydown", onKey);
    el.style.transform = original.transform;
    el.style.width = original.width;
    if (!commit) return;
    if (mode === "resize") {
      if (duration !== note.duration) env.onResize(duration);
    } else if (start !== note.start || pitch !== note.pitch) {
      env.onMove(start, pitch);
    }
  };
  const onUp = (ev: PointerEvent) => {
    if (dragging) finish(true);
    else {
      finish(false);
      env.onClick(ev.shiftKey);
    }
  };
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") finish(false);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
  window.addEventListener("keydown", onKey);
}
