import { makeTrack, newId, ops, ticksPerBar } from "@hpi/shared";
import type { InstrumentKind, SongMeta, TrackKind } from "@hpi/shared";

import { download, engine, renderSong, withAudio } from "../audio/index.ts";
import { useSongStore, useUiStore } from "../state/index.ts";
import type { CountIn, LoopRegion } from "../state/index.ts";

/**
 * Everything the timeline can do to the song, as named undo steps. Components
 * call these and never touch `apply` directly, so undo labels stay consistent
 * and multi-clip gestures are guaranteed to be one transaction.
 */
const song = () => useSongStore.getState();
const ui = () => useUiStore.getState();

export type ClipMove = { clipId: string; startTick: number; trackId?: string };

export const actions = {
  /** Double-click on empty lane: a fresh one-bar pattern and a clip showing it. */
  addClipAt(trackId: string, startTick: number): void {
    const doc = song().doc;
    const track = doc.tracks[trackId];
    if (!track) return;
    const patternId = newId();
    const clipId = newId();
    const bar = ticksPerBar(doc.meta.timeSig);
    song().apply("Add clip", (d) => {
      ops.addPattern(d, { id: patternId, name: `${track.name} ${Object.keys(d.patterns).length + 1}`, kind: track.kind, lengthTicks: bar, notes: [] });
      ops.addClip(d, { id: clipId, trackId, patternId, startTick, lengthTicks: bar, offsetTicks: 0 });
    });
    ui().select([clipId]);
    ui().setEditingClip(clipId);
  },

  moveClips(moves: readonly ClipMove[]): void {
    if (moves.length === 0) return;
    song().apply(moves.length === 1 ? "Move clip" : `Move ${moves.length} clips`, (d) => {
      for (const m of moves) ops.moveClip(d, m.clipId, m.startTick, m.trackId);
    });
  },

  resizeClip(clipId: string, lengthTicks: number): void {
    song().apply("Resize clip", (d) => ops.resizeClip(d, clipId, lengthTicks));
  },

  /** Copies land right after their originals and stay linked to the same pattern. */
  duplicateSelected(): void {
    const ids = ui().selectedClipIds;
    if (ids.length === 0) return;
    const doc = song().doc;
    const created: string[] = [];
    song().apply(ids.length === 1 ? "Duplicate clip" : `Duplicate ${ids.length} clips`, (d) => {
      for (const id of ids) {
        const clip = doc.clips[id];
        if (!clip) continue;
        const copyId = newId();
        ops.addClip(d, { ...clip, id: copyId, startTick: clip.startTick + clip.lengthTicks });
        created.push(copyId);
      }
    });
    ui().select(created);
  },

  deleteSelected(): void {
    const ids = ui().selectedClipIds;
    if (ids.length === 0) return;
    song().apply(ids.length === 1 ? "Delete clip" : `Delete ${ids.length} clips`, (d) => {
      for (const id of ids) ops.removeClip(d, id);
    });
    ui().clearSelection();
  },

  makeUniqueSelected(): void {
    const ids = ui().selectedClipIds;
    if (ids.length === 0) return;
    song().apply("Make unique", (d) => {
      for (const id of ids) ops.makeUnique(d, id, newId(), newId);
    });
  },

  addTrack(kind: TrackKind, instrument: InstrumentKind, name: string): void {
    const id = newId();
    const index = song().doc.trackOrder.length;
    song().apply("Add track", (d) => {
      ops.addTrack(
        d,
        makeTrack({
          id,
          name,
          kind,
          colour: { hue: (["red", "orange", "yellow", "grey"] as const)[index % 4]!, shade: ([100, 75, 50, 25] as const)[Math.floor(index / 4) % 4]! },
          instrument: { kind: instrument, params: {} },
        }),
      );
    });
  },

  renameTrack(trackId: string, name: string): void {
    song().apply("Rename track", (d) => ops.renameTrack(d, trackId, name));
  },

  toggleMute(trackId: string): void {
    const track = song().doc.tracks[trackId];
    if (track) song().apply(track.mix.mute ? "Unmute" : "Mute", (d) => ops.setMix(d, trackId, { mute: !track.mix.mute }));
  },

  toggleSolo(trackId: string): void {
    const track = song().doc.tracks[trackId];
    if (track) song().apply(track.mix.solo ? "Unsolo" : "Solo", (d) => ops.setMix(d, trackId, { solo: !track.mix.solo }));
  },

  addSectionAt(tick: number): void {
    const doc = song().doc;
    const bar = ticksPerBar(doc.meta.timeSig);
    const start = Math.floor(tick / bar) * bar;
    const n = doc.sections.length + 1;
    song().apply("Add section", (d) =>
      ops.addSection(d, { id: newId(), name: `Section ${n}`, startTick: start, endTick: start + 4 * bar, colour: { hue: "grey", shade: 75 } }),
    );
  },

  renameSection(sectionId: string, name: string): void {
    song().apply("Rename section", (d) => ops.updateSection(d, sectionId, { name }));
  },

  seek(tick: number): void {
    engine.seek(Math.max(0, Math.round(tick)));
  },

  play: withAudio(() => {
    engine.play(ui().countInBars);
    ui().setPlaying(true);
  }),

  stop(): void {
    engine.stop();
    ui().setPlaying(false);
    ui().setRecording(false);
  },

  togglePlay(): void {
    if (ui().isPlaying) actions.stop();
    else actions.play();
  },

  /** Arming record also starts playback, so a take can begin on the count-in. */
  toggleRecord: withAudio(() => {
    if (ui().isRecording) {
      actions.stop();
      return;
    }
    ui().setRecording(true);
    if (!ui().isPlaying) {
      engine.play(ui().countInBars);
      ui().setPlaying(true);
    }
  }),

  setLoop(loop: Partial<LoopRegion>): void {
    ui().setLoop(loop);
    engine.setLoop(ui().loop);
  },

  /** With no region marked yet, the loop covers the selected clips or the first four bars. */
  toggleLoop(): void {
    const loop = ui().loop;
    if (!loop.enabled && loop.endTick <= loop.startTick + 1) actions.loopToSelection(true);
    else actions.setLoop({ enabled: !loop.enabled });
  },

  loopToSelection(enable = true): void {
    const doc = song().doc;
    const clips = ui()
      .selectedClipIds.map((id) => doc.clips[id])
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
    const bar = ticksPerBar(doc.meta.timeSig);
    // Selection bounds, else the song's first four bars (at least one).
    const fallbackEnd = Math.min(Math.max(ops.songEndTick(doc), bar), 4 * bar);
    const startTick = clips.length ? Math.min(...clips.map((c) => c.startTick)) : 0;
    const endTick = clips.length ? Math.max(...clips.map((c) => c.startTick + c.lengthTicks)) : fallbackEnd;
    actions.setLoop({ enabled: enable, startTick, endTick });
  },

  toggleMetronome(): void {
    const on = !ui().metronome;
    ui().setMetronome(on);
    engine.setMetronome(on);
  },

  setCountIn(bars: CountIn): void {
    ui().setCountIn(bars);
  },

  cycleCountIn(): void {
    actions.setCountIn(((ui().countInBars + 1) % 3) as CountIn);
  },

  setBpm(bpm: number): void {
    if (!Number.isFinite(bpm)) return;
    song().apply("Tempo", (d) => ops.setBpm(d, Math.min(300, Math.max(20, Math.round(bpm)))));
  },

  setTimeSig(timeSig: SongMeta["timeSig"]): void {
    song().apply("Time signature", (d) => ops.setTimeSig(d, timeSig));
  },

  zoomBy(factor: number): void {
    ui().setZoom(ui().pxPerBar * factor);
  },

  /** Arrow keys: move every selected clip by one grid step, or a bar with Shift. */
  nudgeSelected(deltaTicks: number): void {
    const ids = ui().selectedClipIds;
    const doc = song().doc;
    const moves = ids
      .map((id) => doc.clips[id])
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .map((c) => ({ clipId: c.id, startTick: Math.max(0, c.startTick + deltaTicks) }));
    if (moves.length) actions.moveClips(moves);
  },

  jumpToSection(index: number): void {
    const section = song().doc.sections[index];
    if (section) actions.seek(section.startTick);
  },

  /** Renders offline and hands the browser a WAV. Blocks the UI behind a modal while it runs. */
  async exportWav(): Promise<void> {
    if (ui().exporting) return;
    ui().setExporting(true);
    try {
      const doc = song().doc;
      const blob = await renderSong(doc);
      download(blob, `${doc.meta.title.replace(/[^\w\- ]+/g, "").trim() || "song"}.wav`);
    } finally {
      ui().setExporting(false);
    }
  },
};

