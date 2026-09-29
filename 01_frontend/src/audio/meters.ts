import { engine } from "./engine.ts";

/**
 * Level meters, kept out of React like the playhead. One requestAnimationFrame
 * loop runs while anyone listens and hands each listener its channel's level in
 * dB; the meter element writes a transform to itself and never renders.
 */
type Listener = (db: number) => void;

const listeners = new Map<string, Set<Listener>>();
let frame = 0;

function tick(): void {
  for (const [key, set] of listeners) {
    const db = engine.levelDb(key);
    if (db !== null) for (const listener of set) listener(db);
  }
  frame = requestAnimationFrame(tick);
}

/** `key` is a track id or "master". */
export function subscribeMeter(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(listener);
  if (!frame) frame = requestAnimationFrame(tick);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(key);
    if (listeners.size === 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

export const METER_FLOOR_DB = -60;

/** 0 at the floor, 1 at 0 dBFS. Anything hotter is the meter's cap, not its height. */
export const meterFraction = (db: number): number => Math.min(1, Math.max(0, (db - METER_FLOOR_DB) / -METER_FLOOR_DB));
