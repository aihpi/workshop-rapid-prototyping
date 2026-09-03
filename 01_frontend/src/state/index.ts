import { useSongStore } from "./songStore.ts";
import { useUiStore } from "./uiStore.ts";

export { History } from "./history.ts";
export { useSongStore } from "./songStore.ts";
export type { SongState } from "./songStore.ts";
export { selectEditingPattern, useUiStore } from "./uiStore.ts";
export type { UiState } from "./uiStore.ts";

/**
 * Cross-store wiring, called once from `main.tsx` at module scope. Whenever the
 * document changes, stale selection is pruned on a microtask so it never runs
 * inside a producer. The audio reconciler subscribes here too, once it exists.
 */
export function wireStores(): () => void {
  return useSongStore.subscribe(
    (s) => s.doc,
    (doc) => queueMicrotask(() => useUiStore.getState().pruneAgainst(doc)),
  );
}
