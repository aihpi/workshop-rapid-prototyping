import { ticksPerBar } from "@hpi/shared";
import { useEffect } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import { actions } from "./actions.ts";

const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
};

export const SHORTCUTS: readonly [keys: string, does: string][] = [
  ["Space", "Play / stop"],
  ["Home", "Back to the start"],
  ["1 … 9", "Jump to section"],
  ["← →", "Nudge selected clips by one grid step"],
  ["Shift ← →", "Nudge by a bar"],
  ["D", "Duplicate selected clips (linked)"],
  ["U", "Make selected clips unique"],
  ["Delete", "Delete selected clips"],
  ["Esc", "Clear selection"],
  ["Ctrl Z / Ctrl Shift Z", "Undo / redo"],
  ["Ctrl S", "Save now"],
  ["Ctrl E", "Export WAV"],
  ["+ −", "Zoom"],
  ["?", "This list"],
];

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const ui = useUiStore.getState();
      const tpb = ticksPerBar(useSongStore.getState().doc.meta.timeSig);

      if (e.code === "Space") {
        e.preventDefault(); // a focused button would otherwise also activate
        actions.togglePlay();
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useSongStore.getState().redo();
        else useSongStore.getState().undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useSongStore.getState().redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        actions.deleteSelected();
      } else if (e.key.toLowerCase() === "d" && !mod) {
        e.preventDefault();
        actions.duplicateSelected();
      } else if (e.key.toLowerCase() === "u" && !mod) {
        actions.makeUniqueSelected();
      } else if (e.key === "Escape") {
        useUiStore.getState().clearSelection();
      } else if (e.key === "Home") {
        actions.seek(0);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? tpb : ui.snapTicks || tpb / 16;
        actions.nudgeSelected(e.key === "ArrowLeft" ? -step : step);
      } else if (/^[1-9]$/.test(e.key) && !mod) {
        actions.jumpToSection(Number(e.key) - 1);
      } else if (e.key === "+" || e.key === "=") {
        actions.zoomBy(1.4);
      } else if (e.key === "-" || e.key === "_") {
        actions.zoomBy(1 / 1.4);
      } else if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        void actions.exportWav();
      } else if (e.key === "?") {
        ui.toggleHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
