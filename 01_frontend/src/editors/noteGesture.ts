import type { Note } from "@hpi/shared";
import { snapTicks } from "@hpi/shared";

import type { NoteMove } from "./editorActions.ts";

/**
 * Drag a note in the piano roll: body moves it in time and pitch, right edge
 * resizes it. Same discipline as clips: DOM during the gesture, one store
 * write on release, a plain click (no travel) is reported separately. Other
 * selected notes ride along with the pressed one and keep their offsets.
 */
export type NoteGestureEnv = {
  pxPerStep: number;
  stepTicks: number;
  rowH: number;
  /** Highest pitch shown, i.e. row 0. */
  topPitch: number;
  lowestPitch: number;
  onMove: (moves: NoteMove[]) => void;
  onResize: (duration: number) => void;
  onClick: (shiftKey: boolean) => void;
};

export type GestureNote = { el: HTMLElement; note: Note };

const THRESHOLD = 3;

/** `el` is the pressed note's element; `others` are the rest of the selection, resolved by the caller. */
export function startNoteGesture(e: PointerEvent, el: HTMLElement, note: Note, mode: "move" | "resize", env: NoteGestureEnv, others: readonly GestureNote[] = []): void {
  el.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startY = e.clientY;
  const group: GestureNote[] = mode === "move" ? [{ el, note }, ...others.filter((o) => o.note.id !== note.id)] : [{ el, note }];
  const originals = group.map((g) => ({ transform: g.el.style.transform, width: g.el.style.width }));
  const ticksPerPx = env.stepTicks / env.pxPerStep;
  const minStart = Math.min(...group.map((g) => g.note.start));
  const minPitch = Math.min(...group.map((g) => g.note.pitch));
  const maxPitch = Math.max(...group.map((g) => g.note.pitch));

  let dragging = false;
  let frame = 0;
  let deltaTicks = 0;
  let deltaPitch = 0;
  let duration = note.duration;

  const place = (g: GestureNote) => {
    const x = ((g.note.start + deltaTicks) / env.stepTicks) * env.pxPerStep;
    const y = (env.topPitch - (g.note.pitch + deltaPitch)) * env.rowH;
    g.el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const paint = () => {
    frame = 0;
    if (mode === "resize") el.style.width = `${(duration / env.stepTicks) * env.pxPerStep - 1}px`;
    else for (const g of group) place(g);
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
      // Snap the pressed note, then move the rest by the same delta.
      const snapped = Math.max(0, snapTicks(note.start + dx * ticksPerPx, snap));
      deltaTicks = Math.max(-minStart, snapped - note.start);
      const wanted = -Math.round(dy / env.rowH);
      deltaPitch = Math.min(env.topPitch - maxPitch, Math.max(env.lowestPitch - minPitch, wanted));
    }
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const finish = (commit: boolean) => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("keydown", onKey);
    group.forEach((g, i) => {
      g.el.style.transform = originals[i]!.transform;
      g.el.style.width = originals[i]!.width;
    });
    if (!commit) return;
    if (mode === "resize") {
      if (duration !== note.duration) env.onResize(duration);
    } else if (deltaTicks !== 0 || deltaPitch !== 0) {
      env.onMove(group.map((g) => ({ noteId: g.note.id, start: g.note.start + deltaTicks, pitch: g.note.pitch + deltaPitch })));
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
