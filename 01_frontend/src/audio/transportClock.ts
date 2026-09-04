import { PPQ } from "@hpi/shared";
import { useSyncExternalStore } from "react";
import * as Tone from "tone";

/**
 * The playhead, kept out of React.
 *
 * One requestAnimationFrame loop runs while anyone is listening and hands each
 * listener the transport position. The playhead line writes a transform to its
 * own element from here and never causes a render. Components that must
 * genuinely re-render, such as a bar:beat readout, use `useSixteenth`, whose
 * snapshot only changes sixteen times a bar, so React bails out on the other
 * frames.
 */
type Listener = (ticks: number, seconds: number) => void;

const listeners = new Set<Listener>();
let frame = 0;

function tick(): void {
  const transport = Tone.getTransport();
  const ticks = transport.ticks;
  const seconds = transport.seconds;
  for (const listener of listeners) listener(ticks, seconds);
  frame = requestAnimationFrame(tick);
}

export function subscribePlayhead(listener: Listener): () => void {
  listeners.add(listener);
  if (!frame) frame = requestAnimationFrame(tick);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

// A coarse, integer snapshot for React. Same integer, same reference, no render.
let sixteenth = 0;
const coarseListeners = new Set<() => void>();
let coarseUnsubscribe: (() => void) | null = null;

function subscribeCoarse(callback: () => void): () => void {
  coarseListeners.add(callback);
  coarseUnsubscribe ??= subscribePlayhead((ticks) => {
    const next = Math.floor(ticks / (PPQ / 4));
    if (next !== sixteenth) {
      sixteenth = next;
      for (const cb of coarseListeners) cb();
    }
  });
  return () => {
    coarseListeners.delete(callback);
    if (coarseListeners.size === 0 && coarseUnsubscribe) {
      coarseUnsubscribe();
      coarseUnsubscribe = null;
    }
  };
}

export function useSixteenth(): number {
  return useSyncExternalStore(subscribeCoarse, () => sixteenth, () => 0);
}
