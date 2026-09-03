import { STEP_TICKS } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";
import { create } from "zustand";

/**
 * Everything the user sees that is not part of the song. None of this is
 * undoable, none of it is saved, none of it reaches the audio graph.
 *
 * Note `editingClipId`, not `editingPatternId`: the pattern is derived through
 * the clip, so undoing a "make unique" repoints the editor correctly instead
 * of leaving it staring at a pattern that no longer exists.
 */
export type UiState = {
  selectedClipIds: readonly string[];
  editingClipId: string | null;
  /** Horizontal zoom. */
  pxPerBar: number;
  scrollTick: number;
  snapTicks: number;
  isPlaying: boolean;

  select(ids: readonly string[]): void;
  toggleSelected(id: string): void;
  clearSelection(): void;
  setEditingClip(id: string | null): void;
  setZoom(pxPerBar: number): void;
  setScroll(tick: number): void;
  setSnap(ticks: number): void;
  setPlaying(playing: boolean): void;
  /** Drop references to clips that no longer exist in the document. */
  pruneAgainst(doc: SongDoc): void;
};

export const useUiStore = create<UiState>()((set, get) => ({
  selectedClipIds: [],
  editingClipId: null,
  pxPerBar: 96,
  scrollTick: 0,
  snapTicks: STEP_TICKS,
  isPlaying: false,

  select: (ids) => set({ selectedClipIds: [...ids] }),
  toggleSelected: (id) => {
    const current = get().selectedClipIds;
    set({
      selectedClipIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  },
  clearSelection: () => set({ selectedClipIds: [] }),
  setEditingClip: (id) => set({ editingClipId: id }),
  setZoom: (pxPerBar) => set({ pxPerBar: Math.min(800, Math.max(16, pxPerBar)) }),
  setScroll: (tick) => set({ scrollTick: Math.max(0, tick) }),
  setSnap: (ticks) => set({ snapTicks: ticks }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  pruneAgainst: (doc) => {
    const { selectedClipIds, editingClipId } = get();
    const survivors = selectedClipIds.filter((id) => doc.clips[id]);
    const editing = editingClipId && doc.clips[editingClipId] ? editingClipId : null;
    if (survivors.length !== selectedClipIds.length || editing !== editingClipId) {
      set({ selectedClipIds: survivors, editingClipId: editing });
    }
  },
}));

/** The pattern the bottom pane edits, derived from the clip so undo cannot strand it. */
export const selectEditingPattern = (doc: SongDoc, editingClipId: string | null) => {
  if (!editingClipId) return null;
  const clip = doc.clips[editingClipId];
  return clip ? (doc.patterns[clip.patternId] ?? null) : null;
};
