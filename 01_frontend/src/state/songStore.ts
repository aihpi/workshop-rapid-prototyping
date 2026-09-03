import { emptySong, newId } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { History } from "./history.ts";

/**
 * The song document and nothing else. This store is undoable, persisted, and
 * reconciled into the audio graph. Selection, zoom, playhead and other transient
 * state live in `uiStore` so they can never leak into history or the database.
 */
export type SongState = {
  doc: SongDoc;
  /**
   * Server revision of the document last loaded or saved. Kept outside `doc`
   * on purpose: undo must never rewind it, or the next save would carry a
   * stale rev and be rejected.
   */
  rev: number;
  /** True when there are edits the server has not seen. */
  dirty: boolean;
  /** Increments on every change to `doc`; autosave keys off it. */
  editCount: number;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | undefined;
  redoLabel: string | undefined;

  /** One user-visible edit. Exactly one `produce()`, exactly one undo step. */
  apply(label: string, recipe: (doc: SongDoc) => void): void;
  /** Fold every `apply` until `commit` into one undo step. */
  begin(label: string): void;
  commit(): void;
  abort(): void;
  undo(): void;
  redo(): void;
  /** Replace the document and forget history, as when opening another song. */
  load(doc: SongDoc, rev?: number): void;
  /** A save landed. Clears `dirty` only if nothing changed while it was in flight. */
  markSaved(rev: number, savedEditCount: number): void;
};

const history = new History<SongDoc>();

/** Undo, redo and abort all produce a document the server has not seen. */
function changeDoc(next: SongDoc): void {
  const state = useSongStore.getState();
  if (next === state.doc) return;
  useSongStore.setState({ doc: next, dirty: true, editCount: state.editCount + 1, ...flags() });
}

const flags = () => ({
  canUndo: history.canUndo,
  canRedo: history.canRedo,
  undoLabel: history.undoLabel,
  redoLabel: history.redoLabel,
});

export const useSongStore = create<SongState>()(
  subscribeWithSelector((set, get) => ({
    doc: emptySong(newId()),
    rev: 0,
    dirty: false,
    editCount: 0,
    ...flags(),

    apply: (label, recipe) => {
      const next = history.apply(get().doc, label, recipe);
      if (next !== get().doc) set({ doc: next, dirty: true, editCount: get().editCount + 1, ...flags() });
    },
    begin: (label) => {
      history.begin(label);
      set(flags());
    },
    commit: () => {
      history.commit();
      set(flags());
    },
    abort: () => changeDoc(history.abort(get().doc)),
    undo: () => changeDoc(history.undo(get().doc)),
    redo: () => changeDoc(history.redo(get().doc)),
    load: (doc, rev) => {
      history.clear();
      set({ doc, rev: rev ?? doc.rev, dirty: false, editCount: get().editCount + 1, ...flags() });
    },
    markSaved: (rev, savedEditCount) => {
      set({ rev, dirty: get().editCount !== savedEditCount });
    },
  })),
);
