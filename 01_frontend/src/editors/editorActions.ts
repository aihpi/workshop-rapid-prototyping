import { newId, ops, STEP_TICKS, ticksPerBar } from "@hpi/shared";

import { useSongStore } from "../state/index.ts";

/** What the pattern editors can do, as named undo steps. */
const song = () => useSongStore.getState();

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

  moveNote(patternId: string, noteId: string, start: number, pitch: number): void {
    song().apply("Move note", (d) => ops.updateNote(d, patternId, noteId, { start: Math.max(0, start), pitch: Math.min(127, Math.max(0, pitch)) }));
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
