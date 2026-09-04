import { useSongStore } from "../state/index.ts";
import { engine } from "./engine.ts";

/**
 * Browsers only allow audio to start inside a user gesture, and Safari wants
 * `context.resume()` in the gesture's own call stack. So there is one choke
 * point, it calls `engine.start` (whose first statement is `Tone.start()`) with
 * nothing awaited in front of it, and every audible control goes through it.
 * No "click to enable audio" overlay.
 */
export function ensureAudio(): Promise<void> {
  return engine.start(useSongStore.getState().doc);
}

export function withAudio<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  return (...args) => {
    void ensureAudio().then(() => fn(...args));
  };
}
