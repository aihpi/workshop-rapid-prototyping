import type { MixAutomationParam, ScaleName, SongDoc } from "@hpi/shared";
import { create } from "zustand";

import type { SnapName } from "../timeline/snap.ts";

/**
 * Everything the user sees that is not part of the song. None of this is
 * undoable, none of it is saved, and it reaches the audio graph only through
 * explicit transport calls (loop, click), never through the reconciler.
 *
 * Note `editingClipId`, not `editingPatternId`: the pattern is derived through
 * the clip, so undoing a "make unique" repoints the editor correctly instead
 * of leaving it staring at a pattern that no longer exists.
 */
export type PaneTab = "pattern" | "sound" | "mixer" | "samples";
export type SaveState = "saved" | "dirty" | "saving" | "offline" | "conflict" | "error";
export type SongSummary = { id: string; title: string; bpm: number; rev: number; updatedAt: string };
export type LoopRegion = { enabled: boolean; startTick: number; endTick: number };
export type CountIn = 0 | 1 | 2;

export type UiState = {
  selectedClipIds: readonly string[];
  editingClipId: string | null;
  /** Notes selected in the piano roll, within the pattern being edited. */
  selectedNoteIds: readonly string[];
  /** Horizontal zoom. */
  pxPerBar: number;
  scrollTick: number;
  /** The grid by name; `snapTicksFor` turns it into ticks against the current time signature. */
  snap: SnapName;
  isPlaying: boolean;
  /** Record is armed: live notes land in the pattern being edited. */
  isRecording: boolean;
  loop: LoopRegion;
  metronome: boolean;
  countInBars: CountIn;
  /** Computer keyboard plays the sound panel's track; single-letter shortcuts pause. */
  pianoArmed: boolean;
  /** Web MIDI is only requested on demand, because the browser prompts for it. */
  midiRequested: boolean;
  midiName: string | null;
  /** Which automation lane is open under each track. Absent means closed. */
  automationLanes: Readonly<Record<string, MixAutomationParam>>;
  /** Which bottom pane is showing. */
  paneTab: PaneTab;
  /** Piano roll highlighting only; the song itself has no key. */
  scaleRoot: number;
  scaleName: ScaleName;
  /** Track shown in the sound panel when no clip is being edited. */
  soundTrackId: string | null;
  saveState: SaveState;
  songList: readonly SongSummary[];
  exporting: boolean;
  helpOpen: boolean;
  /** The assistant drawer beside the timeline. */
  aiOpen: boolean;

  select(ids: readonly string[]): void;
  toggleSelected(id: string): void;
  clearSelection(): void;
  selectNotes(ids: readonly string[]): void;
  toggleNote(id: string): void;
  setEditingClip(id: string | null): void;
  setZoom(pxPerBar: number): void;
  setScroll(tick: number): void;
  setSnap(snap: SnapName): void;
  setPlaying(playing: boolean): void;
  setRecording(on: boolean): void;
  setLoop(loop: Partial<LoopRegion>): void;
  setMetronome(on: boolean): void;
  setCountIn(bars: CountIn): void;
  setPianoArmed(on: boolean): void;
  setMidiRequested(on: boolean): void;
  setMidiName(name: string | null): void;
  setAutomationLane(trackId: string, param: MixAutomationParam | null): void;
  setPaneTab(tab: PaneTab): void;
  setScale(root: number, name: ScaleName): void;
  setSoundTrack(trackId: string | null): void;
  setSaveState(state: SaveState): void;
  setSongList(list: readonly SongSummary[]): void;
  setExporting(on: boolean): void;
  toggleHelp(): void;
  toggleAi(): void;
  /** Drop references to clips that no longer exist in the document. */
  pruneAgainst(doc: SongDoc): void;
};

export const useUiStore = create<UiState>()((set, get) => ({
  selectedClipIds: [],
  editingClipId: null,
  selectedNoteIds: [],
  pxPerBar: 96,
  scrollTick: 0,
  snap: "sixteenth",
  isPlaying: false,
  isRecording: false,
  loop: { enabled: false, startTick: 0, endTick: 0 },
  metronome: false,
  countInBars: 0,
  pianoArmed: false,
  midiRequested: false,
  midiName: null,
  automationLanes: {},
  paneTab: "pattern",
  scaleRoot: 53,
  scaleName: "minor",
  soundTrackId: null,
  saveState: "saved",
  songList: [],
  exporting: false,
  helpOpen: false,
  aiOpen: false,

  select: (ids) => set({ selectedClipIds: [...ids] }),
  toggleSelected: (id) => {
    const current = get().selectedClipIds;
    set({
      selectedClipIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  },
  clearSelection: () => set({ selectedClipIds: [], selectedNoteIds: [] }),
  selectNotes: (ids) => set({ selectedNoteIds: [...ids] }),
  toggleNote: (id) => {
    const current = get().selectedNoteIds;
    set({ selectedNoteIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] });
  },
  setEditingClip: (id) => set(id ? { editingClipId: id, paneTab: "pattern", selectedNoteIds: [] } : { editingClipId: id, selectedNoteIds: [] }),
  setZoom: (pxPerBar) => set({ pxPerBar: Math.min(800, Math.max(16, pxPerBar)) }),
  setScroll: (tick) => set({ scrollTick: Math.max(0, tick) }),
  setSnap: (snap) => set({ snap }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setRecording: (isRecording) => set({ isRecording }),
  setLoop: (loop) => {
    const next = { ...get().loop, ...loop };
    next.startTick = Math.max(0, next.startTick);
    if (next.endTick <= next.startTick) next.endTick = next.startTick + 1;
    set({ loop: next });
  },
  setMetronome: (metronome) => set({ metronome }),
  setCountIn: (countInBars) => set({ countInBars }),
  setPianoArmed: (pianoArmed) => set({ pianoArmed }),
  setMidiRequested: (midiRequested) => set({ midiRequested }),
  setMidiName: (midiName) => set({ midiName }),
  setAutomationLane: (trackId, param) => {
    const { [trackId]: _closed, ...rest } = get().automationLanes;
    set({ automationLanes: param ? { ...rest, [trackId]: param } : rest });
  },
  setPaneTab: (tab) => set({ paneTab: tab }),
  setScale: (root, name) => set({ scaleRoot: root, scaleName: name }),
  setSoundTrack: (trackId) => set({ soundTrackId: trackId }),
  setSaveState: (saveState) => set({ saveState }),
  setSongList: (songList) => set({ songList }),
  setExporting: (exporting) => set({ exporting }),
  toggleHelp: () => set({ helpOpen: !get().helpOpen }),
  toggleAi: () => set({ aiOpen: !get().aiOpen }),
  pruneAgainst: (doc) => {
    const { selectedClipIds, editingClipId, soundTrackId, selectedNoteIds, automationLanes } = get();
    const survivors = selectedClipIds.filter((id) => doc.clips[id]);
    const editing = editingClipId && doc.clips[editingClipId] ? editingClipId : null;
    const sound = soundTrackId && doc.tracks[soundTrackId] ? soundTrackId : null;
    const pattern = selectEditingPattern(doc, editing);
    const notes = pattern ? selectedNoteIds.filter((id) => pattern.notes.some((n) => n.id === id)) : [];
    const lanes = Object.fromEntries(Object.entries(automationLanes).filter(([trackId]) => doc.tracks[trackId]));
    if (
      survivors.length !== selectedClipIds.length ||
      editing !== editingClipId ||
      sound !== soundTrackId ||
      notes.length !== selectedNoteIds.length ||
      Object.keys(lanes).length !== Object.keys(automationLanes).length
    ) {
      set({ selectedClipIds: survivors, editingClipId: editing, soundTrackId: sound, selectedNoteIds: notes, automationLanes: lanes });
    }
  },
}));

/**
 * The track the sound panel shows and live notes play: the one behind the
 * clip being edited, else the one chosen in the panel, else the first.
 */
export const selectSoundTrackId = (doc: SongDoc, ui: Pick<UiState, "editingClipId" | "soundTrackId">): string | undefined => {
  const editingTrackId = ui.editingClipId ? doc.clips[ui.editingClipId]?.trackId : undefined;
  return editingTrackId ?? ui.soundTrackId ?? doc.trackOrder[0];
};

/** The pattern the bottom pane edits, derived from the clip so undo cannot strand it. */
export const selectEditingPattern = (doc: SongDoc, editingClipId: string | null) => {
  if (!editingClipId) return null;
  const clip = doc.clips[editingClipId];
  return clip ? (doc.patterns[clip.patternId] ?? null) : null;
};
