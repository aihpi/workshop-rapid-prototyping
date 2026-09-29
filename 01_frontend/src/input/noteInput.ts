import { ops } from "@hpi/shared";
import type { Note } from "@hpi/shared";

import { engine, ensureAudio } from "../audio/index.ts";
import { selectEditingPattern, selectSoundTrackId, useSongStore, useUiStore } from "../state/index.ts";
import { snapTicksFor } from "../timeline/snap.ts";
import { isTyping } from "../timeline/useShortcuts.ts";
import { clampOctave, DEFAULT_OCTAVE, keyToPitch, OCTAVE_DOWN, OCTAVE_UP } from "./keyboardPiano.ts";
import { startMidi } from "./midi.ts";
import { quantiseTake } from "./take.ts";
import type { OpenNote } from "./take.ts";

/**
 * Live notes from a MIDI keyboard or the computer keyboard. They play the
 * sound panel's track straight away and, while record is armed, land in the
 * pattern being edited. The take is buffered and written with one `apply`
 * when recording stops, so it is one undo step and never shares the history
 * transaction with a fader drag or a clip move happening at the same time.
 * Installed once from `main.tsx`, never from a component. MIDI access is
 * asked for only when the user presses Connect, because Chromium prompts.
 *
 * ponytail: notes appear when the take ends, not as they are played. Live
 * display needs owner-scoped history transactions.
 */
const song = () => useSongStore.getState();
const ui = () => useUiStore.getState();

let octave = DEFAULT_OCTAVE;
/** Pitches currently sounding and the track they were started on, so release goes to the same voice. */
const sounding = new Map<number, string>();
/** Pitches held while recording, waiting for their release to become notes. */
const held = new Map<number, OpenNote>();
/** The take so far: pattern id and its notes, written on stop. */
let take: { patternId: string; notes: Note[] } | null = null;
const heldKeys = new Map<string, number>();

const targetTrackId = (): string | undefined => selectSoundTrackId(song().doc, ui());
const targetTrackKind = () => {
  const id = targetTrackId();
  return id ? song().doc.tracks[id]?.kind : undefined;
};

/** Both go through `ensureAudio` so an off can never overtake the on it belongs to while the context starts. */
export function noteOn(pitch: number, velocity: number): void {
  const trackId = targetTrackId();
  if (!trackId) return;
  sounding.set(pitch, trackId);
  void ensureAudio().then(() => engine.noteOn(trackId, pitch, velocity));
  if (ui().isRecording) held.set(pitch, { pitch, velocity, startTick: engine.positionTicks });
}

export function noteOff(pitch: number): void {
  const trackId = sounding.get(pitch);
  sounding.delete(pitch);
  if (trackId) void ensureAudio().then(() => engine.noteOff(trackId, pitch));
  const open = held.get(pitch);
  if (!open) return;
  held.delete(pitch);
  record(open, engine.positionTicks);
}

function record(open: OpenNote, endTick: number): void {
  const doc = song().doc;
  const clipId = ui().editingClipId;
  const clip = clipId ? doc.clips[clipId] : undefined;
  const pattern = selectEditingPattern(doc, clipId);
  if (!clip || !pattern) return;
  const note = quantiseTake(open, endTick, clip, pattern, snapTicksFor(ui().snap, doc.meta.timeSig));
  if (!note) return;
  if (take && take.patternId !== pattern.id) closeTake();
  take ??= { patternId: pattern.id, notes: [] };
  take.notes.push(note);
}

function closeTake(): void {
  held.clear();
  const finished = take;
  take = null;
  if (!finished || finished.notes.length === 0) return;
  song().apply("Record take", (d) => {
    for (const note of finished.notes) ops.addNote(d, finished.patternId, note);
  });
}

/** Keys still down when focus leaves or the piano is switched off would otherwise sustain forever. */
function releaseAllKeys(): void {
  for (const pitch of heldKeys.values()) noteOff(pitch);
  heldKeys.clear();
}

let stopMidi: (() => void) | null = null;

export async function connectMidi(): Promise<void> {
  if (stopMidi) return;
  ui().setMidiRequested(true);
  stopMidi = await startMidi(
    (event) => (event.type === "on" ? noteOn(event.pitch, event.velocity) : noteOff(event.pitch)),
    (name) => ui().setMidiName(name),
  );
}

export function installNoteInput(): () => void {
  const unsubscribe = useUiStore.subscribe((state, previous) => {
    if (previous.isRecording && !state.isRecording) closeTake();
    if (previous.pianoArmed && !state.pianoArmed) releaseAllKeys();
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (!ui().pianoArmed || isTyping(e.target) || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === OCTAVE_DOWN || e.code === OCTAVE_UP) {
      octave = clampOctave(octave + (e.code === OCTAVE_UP ? 1 : -1));
      return;
    }
    const pitch = keyToPitch(e.code, octave, targetTrackKind());
    if (pitch === null || heldKeys.has(e.code)) return;
    e.preventDefault();
    heldKeys.set(e.code, pitch);
    noteOn(pitch, 0.8);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const pitch = heldKeys.get(e.code);
    if (pitch === undefined) return;
    heldKeys.delete(e.code);
    noteOff(pitch);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseAllKeys);

  return () => {
    unsubscribe();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", releaseAllKeys);
    stopMidi?.();
    stopMidi = null;
  };
}
