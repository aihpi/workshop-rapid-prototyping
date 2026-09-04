import { PPQ } from "@hpi/shared";
import type { Clip, Pattern, SongDoc, Track } from "@hpi/shared";
import * as Tone from "tone";

import { applyMix, buildGraph, buildTrackNodes, disposeTrackNodes, replaceVoice, sampleUrlFor } from "./buildGraph.ts";
import type { Graph } from "./buildGraph.ts";
import { resolvedParams } from "@hpi/shared";
import { createPart } from "./parts.ts";
import type { EngineLike } from "./reconcile.ts";
import type { PatternEvent } from "./schedule.ts";

/**
 * The live audio engine: one module singleton wrapping one graph. It is
 * started from a user gesture, built from the document at that moment, and
 * then kept in step by the reconciler. Every mutator is a no-op until started,
 * which is what lets the store subscription be wired before audio exists.
 */
export class AudioEngine implements EngineLike {
  private graph: Graph | null = null;
  private readonly parts = new Map<string, Tone.Part<PatternEvent>>();
  private starting: Promise<void> | null = null;

  get isStarted(): boolean {
    return this.graph !== null;
  }

  /** Must be reached synchronously from a user gesture: `Tone.start()` is the first statement. */
  start(doc: SongDoc): Promise<void> {
    if (this.starting) return this.starting;
    const resume = Tone.start();
    this.starting = resume.then(() => {
      const transport = Tone.getTransport();
      if (transport.PPQ !== PPQ) {
        throw new Error(`Tone PPQ ${transport.PPQ} does not match song PPQ ${PPQ}`);
      }
      transport.bpm.value = doc.meta.bpm;
      this.graph = buildGraph(doc);
      for (const clip of Object.values(doc.clips)) {
        const pattern = doc.patterns[clip.patternId];
        if (pattern) this.syncClip(clip, pattern);
      }
    });
    return this.starting;
  }

  // ---------------------------------------------------------------- transport

  play(): void {
    Tone.getTransport().start();
  }

  stop(): void {
    Tone.getTransport().stop();
  }

  seek(tick: number): void {
    Tone.getTransport().ticks = tick;
  }

  get positionTicks(): number {
    return Tone.getTransport().ticks;
  }

  get isPlaying(): boolean {
    return Tone.getTransport().state === "started";
  }

  // --------------------------------------------------------------- EngineLike

  setBpm(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  setMasterVolume(db: number): void {
    if (this.graph) this.graph.master.volume.value = db;
  }

  addTrack(track: Track, doc: SongDoc): void {
    if (!this.graph) return;
    this.graph.tracks.set(track.id, buildTrackNodes(track, this.graph, sampleUrlFor(track, doc)));
  }

  removeTrack(trackId: string): void {
    const nodes = this.graph?.tracks.get(trackId);
    if (!nodes || !this.graph) return;
    disposeTrackNodes(nodes);
    this.graph.tracks.delete(trackId);
  }

  setMix(track: Track): void {
    const nodes = this.graph?.tracks.get(track.id);
    if (nodes) applyMix(nodes, track.mix);
  }

  setInstrumentParams(track: Track): void {
    this.graph?.tracks.get(track.id)?.voice.set(resolvedParams(track.instrument));
  }

  rebuildInstrument(track: Track, doc: SongDoc): void {
    const nodes = this.graph?.tracks.get(track.id);
    if (nodes) replaceVoice(nodes, track, sampleUrlFor(track, doc));
  }

  syncClip(clip: Clip, pattern: Pattern): void {
    if (!this.graph) return;
    this.parts.get(clip.id)?.dispose();
    this.parts.set(clip.id, createPart(clip, pattern, this.graph));
  }

  removeClip(clipId: string): void {
    this.parts.get(clipId)?.dispose();
    this.parts.delete(clipId);
  }

  dispose(): void {
    for (const part of this.parts.values()) part.dispose();
    this.parts.clear();
    this.graph?.dispose();
    this.graph = null;
    this.starting = null;
  }
}

export const engine = new AudioEngine();
