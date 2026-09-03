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
  load(doc: SongDoc): void;
};

const history = new History<SongDoc>();

const flags = () => ({
  canUndo: history.canUndo,
  canRedo: history.canRedo,
  undoLabel: history.undoLabel,
  redoLabel: history.redoLabel,
});

export const useSongStore = create<SongState>()(
  subscribeWithSelector((set, get) => ({
    doc: emptySong(newId()),
    ...flags(),

    apply: (label, recipe) => {
      const next = history.apply(get().doc, label, recipe);
      if (next !== get().doc) set({ doc: next, ...flags() });
    },
    begin: (label) => {
      history.begin(label);
      set(flags());
    },
    commit: () => {
      history.commit();
      set(flags());
    },
    abort: () => set({ doc: history.abort(get().doc), ...flags() }),
    undo: () => set({ doc: history.undo(get().doc), ...flags() }),
    redo: () => set({ doc: history.redo(get().doc), ...flags() }),
    load: (doc) => {
      history.clear();
      set({ doc, ...flags() });
    },
  })),
);
