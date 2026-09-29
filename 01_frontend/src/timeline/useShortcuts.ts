import { ticksPerBar } from "@hpi/shared";
import { useEffect } from "react";

import { editorActions } from "../editors/editorActions.ts";
import { useSongStore, useUiStore } from "../state/index.ts";
import { actions } from "./actions.ts";
import { snapTicksFor } from "./snap.ts";

export const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
};

export const SHORTCUTS: readonly [keys: string, does: string][] = [
  ["Space", "Play / stop"],
  ["R", "Record live notes into the open pattern"],
  ["L", "Loop on / off"],
  ["Ctrl L", "Loop the selected clips"],
  ["M", "Metronome click"],
  ["C", "Cycle the count-in"],
  ["Home", "Back to the start"],
  ["1 … 9", "Jump to section"],
  ["← →", "Nudge selected clips by one grid step"],
  ["Shift ← →", "Nudge by a bar"],
  ["D", "Duplicate selected clips (linked)"],
  ["U", "Make selected clips unique"],
  ["Q", "Quantise the open pattern to the grid"],
  ["Delete", "Delete selected notes, else selected clips"],
  ["Esc", "Clear selection"],
  ["Ctrl Z / Ctrl Shift Z", "Undo / redo"],
  ["Ctrl S", "Save now"],
  ["Ctrl E", "Export WAV"],
  ["Ctrl K", "AI assistant"],
  ["+ −", "Zoom"],
  ["?", "This list"],
];

/** The computer-keyboard piano, shown in the help modal. Letters are taken by it while it is on. */
export const PIANO_KEYS: readonly [keys: string, does: string][] = [
  ["A W S E D F T G Y H U J K", "C to C, one octave"],
  ["Z / X", "Octave down / up"],
];

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const ui = useUiStore.getState();
      const timeSig = useSongStore.getState().doc.meta.timeSig;
      const tpb = ticksPerBar(timeSig);
      const key = e.key.toLowerCase();
      // Plain letters belong to the piano while it is armed; everything with a modifier still works.
      const letters = !ui.pianoArmed && !mod;

      if (e.code === "Space") {
        e.preventDefault(); // a focused button would otherwise also activate
        actions.togglePlay();
      } else if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) useSongStore.getState().redo();
        else useSongStore.getState().undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        useSongStore.getState().redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (ui.selectedNoteIds.length) editorActions.deleteSelectedNotes();
        else actions.deleteSelected();
      } else if (letters && key === "d") {
        e.preventDefault();
        actions.duplicateSelected();
      } else if (letters && key === "u") {
        actions.makeUniqueSelected();
      } else if (letters && key === "r") {
        actions.toggleRecord();
      } else if (mod && key === "l") {
        e.preventDefault();
        actions.loopToSelection();
      } else if (letters && key === "l") {
        actions.toggleLoop();
      } else if (letters && key === "m") {
        actions.toggleMetronome();
      } else if (letters && key === "c") {
        actions.cycleCountIn();
      } else if (letters && key === "q") {
        editorActions.quantiseOpenPattern();
      } else if (e.key === "Escape") {
        ui.clearSelection();
      } else if (e.key === "Home") {
        actions.seek(0);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? tpb : snapTicksFor(ui.snap, timeSig) || snapTicksFor("sixteenth", timeSig);
        actions.nudgeSelected(e.key === "ArrowLeft" ? -step : step);
      } else if (/^[1-9]$/.test(e.key) && !mod) {
        actions.jumpToSection(Number(e.key) - 1);
      } else if (e.key === "+" || e.key === "=") {
        actions.zoomBy(1.4);
      } else if (e.key === "-" || e.key === "_") {
        actions.zoomBy(1 / 1.4);
      } else if (mod && key === "e") {
        e.preventDefault();
        void actions.exportWav();
      } else if (mod && key === "k") {
        e.preventDefault();
        ui.toggleAi();
      } else if (e.key === "?") {
        ui.toggleHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
