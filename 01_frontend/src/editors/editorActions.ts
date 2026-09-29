import { newId, ops, STEP_TICKS, ticksPerBar } from "@hpi/shared";

import { selectEditingPattern, useSongStore, useUiStore } from "../state/index.ts";
import { snapTicksFor } from "../timeline/snap.ts";

/** What the pattern editors can do, as named undo steps. */
const song = () => useSongStore.getState();
const ui = () => useUiStore.getState();

export type NoteMove = { noteId: string; start: number; pitch: number };

export const editorActions = {
  toggleStep(patternId: string, pitch: number, start: number, velocity = 1): void {
    song().apply("Toggle step", (d) => ops.toggleStep(d, patternId, pitch, start, STEP_TICKS, newId(), velocity));
  },

  addNote(patternId: string, pitch: number, start: number, duration: number, velocity = 0.9): void {
    song().apply("Add note", (d) => ops.addNote(d, patternId, { id: newId(), pitch, start, duration, velocity }));
  },

  removeNote(patternId: string, noteId: string): void {
    song().apply("Delete note", (d) => ops.removeNote(d, patternId, noteId));
  },

  moveNotes(patternId: string, moves: readonly NoteMove[]): void {
    if (moves.length === 0) return;
    song().apply(moves.length === 1 ? "Move note" : `Move ${moves.length} notes`, (d) => {
      for (const m of moves) ops.updateNote(d, patternId, m.noteId, { start: Math.max(0, m.start), pitch: Math.min(127, Math.max(0, m.pitch)) });
    });
  },

  deleteSelectedNotes(): void {
    const pattern = selectEditingPattern(song().doc, ui().editingClipId);
    const ids = ui().selectedNoteIds;
    if (!pattern || ids.length === 0) return;
    song().apply(ids.length === 1 ? "Delete note" : `Delete ${ids.length} notes`, (d) => {
      for (const id of ids) ops.removeNote(d, pattern.id, id);
    });
    ui().selectNotes([]);
  },

  /** Velocity drags call this per move inside `begin`/`commit`, like a fader. */
  setVelocity(patternId: string, noteIds: readonly string[], velocity: number): void {
    song().apply("Velocity", (d) => ops.setNoteVelocity(d, patternId, noteIds, velocity));
  },

  quantise(patternId: string, noteIds: readonly string[] | null, grid: number): void {
    song().apply("Quantise", (d) => ops.quantiseNotes(d, patternId, noteIds, grid));
  },

  /** Q: the selected notes, or the whole open pattern, onto the current snap grid. */
  quantiseOpenPattern(): void {
    const pattern = selectEditingPattern(song().doc, ui().editingClipId);
    if (!pattern) return;
    const ids = ui().selectedNoteIds;
    editorActions.quantise(pattern.id, ids.length ? ids : null, snapTicksFor(ui().snap, song().doc.meta.timeSig) || STEP_TICKS);
  },

  resizeNote(patternId: string, noteId: string, duration: number): void {
    song().apply("Resize note", (d) => ops.updateNote(d, patternId, noteId, { duration: Math.max(1, duration) }));
  },

  /** Shift-click on a step: full, medium, soft, then round again. */
  cycleVelocity(patternId: string, noteId: string): void {
    const note = song().doc.patterns[patternId]?.notes.find((n) => n.id === noteId);
    if (!note) return;
    const next = note.velocity > 0.8 ? 0.65 : note.velocity > 0.5 ? 0.35 : 1;
    song().apply("Change velocity", (d) => ops.updateNote(d, patternId, noteId, { velocity: next }));
  },

  setPatternBars(patternId: string, bars: number): void {
    const tpb = ticksPerBar(song().doc.meta.timeSig);
    song().apply("Change pattern length", (d) => ops.setPatternLength(d, patternId, bars * tpb));
  },

  renamePattern(patternId: string, name: string): void {
    song().apply("Rename pattern", (d) => ops.renamePattern(d, patternId, name));
  },

  makeUnique(clipId: string): void {
    song().apply("Make unique", (d) => ops.makeUnique(d, clipId, newId(), newId));
  },
};
