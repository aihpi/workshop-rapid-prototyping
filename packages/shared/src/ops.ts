// Pure operations on a song document. Each mutates the document it is given and
// returns nothing, so the frontend can run one inside a single Immer `produce()`
// and get exactly one undo step. Ids come from the caller.

import { snapTicks } from "./music.ts";
import type { AutomationPoint, Clip, Effect, Instrument, Mix, Note, Pattern, Section, SongDoc, SongMeta, Track } from "./song.ts";

export function addTrack(doc: SongDoc, track: Track, atIndex?: number): void {
  doc.tracks[track.id] = track;
  if (atIndex === undefined) doc.trackOrder.push(track.id);
  else doc.trackOrder.splice(atIndex, 0, track.id);
}

/** Removes the track and every clip on it. Patterns are left in place. */
export function removeTrack(doc: SongDoc, trackId: string): void {
  delete doc.tracks[trackId];
  doc.trackOrder = doc.trackOrder.filter((id) => id !== trackId);
  for (const clip of Object.values(doc.clips)) {
    if (clip.trackId === trackId) delete doc.clips[clip.id];
  }
}

export function moveTrack(doc: SongDoc, trackId: string, toIndex: number): void {
  const from = doc.trackOrder.indexOf(trackId);
  if (from === -1) return;
  doc.trackOrder.splice(from, 1);
  doc.trackOrder.splice(toIndex, 0, trackId);
}

export function renameTrack(doc: SongDoc, trackId: string, name: string): void {
  const track = doc.tracks[trackId];
  if (track) track.name = name;
}

export function setMix(doc: SongDoc, trackId: string, mix: Partial<Mix>): void {
  const track = doc.tracks[trackId];
  if (!track) return;
  Object.assign(track.mix, mix);
}

export function setSend(doc: SongDoc, trackId: string, send: keyof Mix["sends"], amount: number): void {
  const track = doc.tracks[trackId];
  if (track) track.mix.sends[send] = amount;
}

export function setInstrument(doc: SongDoc, trackId: string, instrument: Instrument): void {
  const track = doc.tracks[trackId];
  if (track) track.instrument = instrument;
}

export function setInstrumentParam(doc: SongDoc, trackId: string, key: string, value: number | string | boolean): void {
  const track = doc.tracks[trackId];
  if (track) track.instrument.params[key] = value;
}

export function addPattern(doc: SongDoc, pattern: Pattern): void {
  doc.patterns[pattern.id] = pattern;
}

export function renamePattern(doc: SongDoc, patternId: string, name: string): void {
  const pattern = doc.patterns[patternId];
  if (pattern) pattern.name = name;
}

/** Notes that no longer fit are dropped, so a shortened pattern never plays ghosts. */
export function setPatternLength(doc: SongDoc, patternId: string, lengthTicks: number): void {
  const pattern = doc.patterns[patternId];
  if (!pattern) return;
  pattern.lengthTicks = Math.max(1, lengthTicks);
  pattern.notes = pattern.notes.filter((n) => n.start < pattern.lengthTicks);
}

/** Only used by the save-time sweep. The live document never garbage-collects. */
export function removeOrphanPatterns(doc: SongDoc): void {
  const referenced = new Set(Object.values(doc.clips).map((c) => c.patternId));
  for (const id of Object.keys(doc.patterns)) {
    if (!referenced.has(id)) delete doc.patterns[id];
  }
}

export function addClip(doc: SongDoc, clip: Clip): void {
  doc.clips[clip.id] = clip;
}

export function moveClip(doc: SongDoc, clipId: string, startTick: number, trackId?: string): void {
  const clip = doc.clips[clipId];
  if (!clip) return;
  clip.startTick = Math.max(0, startTick);
  if (trackId !== undefined) clip.trackId = trackId;
}

export function resizeClip(doc: SongDoc, clipId: string, lengthTicks: number): void {
  const clip = doc.clips[clipId];
  if (clip) clip.lengthTicks = Math.max(1, lengthTicks);
}

/** Removes the placement only. The pattern stays, even if nothing else uses it. */
export function removeClip(doc: SongDoc, clipId: string): void {
  delete doc.clips[clipId];
}

/**
 * Breaks a clip's link to its shared pattern by giving it a private copy.
 * The caller supplies the new ids so the operation is deterministic.
 */
export function makeUnique(doc: SongDoc, clipId: string, newPatternId: string, noteIds: () => string): void {
  const clip = doc.clips[clipId];
  if (!clip) return;
  const source = doc.patterns[clip.patternId];
  if (!source) return;
  doc.patterns[newPatternId] = {
    ...source,
    id: newPatternId,
    name: `${source.name} copy`,
    notes: source.notes.map((n) => ({ ...n, id: noteIds() })),
  };
  clip.patternId = newPatternId;
}

export function addNote(doc: SongDoc, patternId: string, note: Note): void {
  doc.patterns[patternId]?.notes.push(note);
}

export function removeNote(doc: SongDoc, patternId: string, noteId: string): void {
  const pattern = doc.patterns[patternId];
  if (pattern) pattern.notes = pattern.notes.filter((n) => n.id !== noteId);
}

export function updateNote(doc: SongDoc, patternId: string, noteId: string, changes: Partial<Omit<Note, "id">>): void {
  const note = doc.patterns[patternId]?.notes.find((n) => n.id === noteId);
  if (note) Object.assign(note, changes);
}

/**
 * The step-grid gesture: a click on (pitch, tick) adds a note there if the cell
 * is empty and removes whatever note starts there otherwise.
 */
export function toggleStep(
  doc: SongDoc,
  patternId: string,
  pitch: number,
  start: number,
  duration: number,
  newNoteId: string,
  velocity = 1,
): void {
  const pattern = doc.patterns[patternId];
  if (!pattern) return;
  const existing = pattern.notes.findIndex((n) => n.pitch === pitch && n.start === start);
  if (existing >= 0) pattern.notes.splice(existing, 1);
  else pattern.notes.push({ id: newNoteId, start, duration, pitch, velocity });
}

/**
 * Moves note starts toward the grid. Strength 1 lands on it, 0.5 goes halfway,
 * the DAW convention. A note that would snap onto the pattern's end falls back
 * one grid step so it never leaves the pattern. `noteIds` null means every note.
 */
export function quantiseNotes(doc: SongDoc, patternId: string, noteIds: readonly string[] | null, grid: number, strength = 1): void {
  const pattern = doc.patterns[patternId];
  if (!pattern || grid <= 0) return;
  const chosen = noteIds === null ? null : new Set(noteIds);
  for (const note of pattern.notes) {
    if (chosen && !chosen.has(note.id)) continue;
    let target = snapTicks(note.start, grid);
    if (target >= pattern.lengthTicks) target -= grid;
    note.start = Math.max(0, Math.round(note.start + (target - note.start) * strength));
  }
}

export function setNoteVelocity(doc: SongDoc, patternId: string, noteIds: readonly string[], velocity: number): void {
  const pattern = doc.patterns[patternId];
  if (!pattern) return;
  const chosen = new Set(noteIds);
  const v = Math.min(1, Math.max(0, velocity));
  for (const note of pattern.notes) if (chosen.has(note.id)) note.velocity = v;
}

export function addEffect(doc: SongDoc, trackId: string, effect: Effect, atIndex?: number): void {
  const track = doc.tracks[trackId];
  if (!track) return;
  if (atIndex === undefined) track.effects.push(effect);
  else track.effects.splice(atIndex, 0, effect);
}

export function removeEffect(doc: SongDoc, trackId: string, effectId: string): void {
  const track = doc.tracks[trackId];
  if (track) track.effects = track.effects.filter((e) => e.id !== effectId);
}

export function moveEffect(doc: SongDoc, trackId: string, effectId: string, toIndex: number): void {
  const track = doc.tracks[trackId];
  if (!track) return;
  const from = track.effects.findIndex((e) => e.id === effectId);
  if (from === -1) return;
  const [effect] = track.effects.splice(from, 1);
  track.effects.splice(Math.min(Math.max(0, toIndex), track.effects.length), 0, effect!);
}

export function setEffectEnabled(doc: SongDoc, trackId: string, effectId: string, enabled: boolean): void {
  const effect = doc.tracks[trackId]?.effects.find((e) => e.id === effectId);
  if (effect) effect.enabled = enabled;
}

export function setEffectParam(doc: SongDoc, trackId: string, effectId: string, key: string, value: number | string): void {
  const effect = doc.tracks[trackId]?.effects.find((e) => e.id === effectId);
  if (effect) effect.params[key] = value;
}

/** Adds a point or moves the one already at that tick. Points stay sorted. */
export function setAutomationPoint(doc: SongDoc, trackId: string, param: string, tick: number, value: number): void {
  const track = doc.tracks[trackId];
  if (!track) return;
  const lane = (track.automation[param] ??= { points: [] });
  const existing = lane.points.find((p) => p.tick === tick);
  if (existing) existing.value = value;
  else {
    lane.points.push({ tick, value });
    lane.points.sort((a, b) => a.tick - b.tick);
  }
}

/** Deleting the last point deletes the lane, so the fader owns the parameter again. */
export function removeAutomationPoint(doc: SongDoc, trackId: string, param: string, tick: number): void {
  const track = doc.tracks[trackId];
  const lane = track?.automation[param];
  if (!track || !lane) return;
  lane.points = lane.points.filter((p) => p.tick !== tick);
  if (lane.points.length === 0) delete track.automation[param];
}

/** Replaces a whole lane. Later duplicates of a tick win; an empty list clears the lane. */
export function setAutomationLane(doc: SongDoc, trackId: string, param: string, points: readonly AutomationPoint[]): void {
  const track = doc.tracks[trackId];
  if (!track) return;
  const byTick = new Map<number, number>();
  for (const p of points) byTick.set(p.tick, p.value);
  const sorted = [...byTick.entries()].sort((a, b) => a[0] - b[0]).map(([tick, value]) => ({ tick, value }));
  if (sorted.length === 0) delete track.automation[param];
  else track.automation[param] = { points: sorted };
}

export function setTimeSig(doc: SongDoc, timeSig: SongMeta["timeSig"]): void {
  doc.meta.timeSig = timeSig;
}

export function setBpm(doc: SongDoc, bpm: number): void {
  doc.meta.bpm = bpm;
}

export function setMasterVolume(doc: SongDoc, db: number): void {
  doc.meta.masterVolume = Math.min(6, Math.max(-60, db));
}

export function setTitle(doc: SongDoc, title: string): void {
  doc.meta.title = title;
}

export function addSection(doc: SongDoc, section: Section): void {
  doc.sections.push(section);
  doc.sections.sort((a, b) => a.startTick - b.startTick);
}

export function updateSection(doc: SongDoc, sectionId: string, changes: Partial<Omit<Section, "id">>): void {
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section) return;
  Object.assign(section, changes);
  doc.sections.sort((a, b) => a.startTick - b.startTick);
}

export function removeSection(doc: SongDoc, sectionId: string): void {
  doc.sections = doc.sections.filter((s) => s.id !== sectionId);
}

export function addSample(doc: SongDoc, sample: SongDoc["samples"][string]): void {
  doc.samples[sample.id] = sample;
}

export function removeSample(doc: SongDoc, sampleId: string): void {
  delete doc.samples[sampleId];
  for (const track of Object.values(doc.tracks)) {
    if (track.instrument.sampleId === sampleId) delete track.instrument.sampleId;
  }
}

/** How many placements share a pattern. Derived, never stored. */
export const placementCount = (doc: SongDoc, patternId: string): number =>
  Object.values(doc.clips).filter((c) => c.patternId === patternId).length;

/** Last tick anything occupies, so the transport knows where the song ends. */
export const songEndTick = (doc: SongDoc): number =>
  Math.max(
    0,
    ...Object.values(doc.clips).map((c) => c.startTick + c.lengthTicks),
    ...doc.sections.map((s) => s.endTick),
  );
