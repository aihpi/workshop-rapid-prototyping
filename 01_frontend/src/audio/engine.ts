import { PPQ, resolvedEffectParams, resolvedParams } from "@hpi/shared";
import type { Clip, Effect, Pattern, SongDoc, TimeSig, Track } from "@hpi/shared";
import * as Tone from "tone";

import { holdTrackAutomation, scheduleAllAutomation, scheduleTrackAutomation } from "./automation.ts";
import { applyMix, buildGraph, buildTrackNodes, disposeTrackNodes, rebuildEffects, replaceVoice, sampleUrlFor } from "./buildGraph.ts";
import type { Graph } from "./buildGraph.ts";
import * as metronome from "./metronome.ts";
import { createPart } from "./parts.ts";
import type { EngineLike } from "./reconcile.ts";
import type { PatternEvent } from "./schedule.ts";
import type { LoopRegion } from "../state/uiStore.ts";

/**
 * The live audio engine: one module singleton wrapping one graph. It is
 * started from a user gesture, built from the document at that moment, and
 * then kept in step by the reconciler. Every mutator is a no-op until started,
 * which is what lets the store subscription be wired before audio exists.
 *
 * The engine keeps the latest document because automation has to be
 * rescheduled from the playhead whenever the playhead jumps, and that needs
 * every lane, not just the one that changed.
 */
export class AudioEngine implements EngineLike {
  private graph: Graph | null = null;
  private doc: SongDoc | null = null;
  private readonly parts = new Map<string, Tone.Part<PatternEvent>>();
  private starting: Promise<void> | null = null;
  private loop: LoopRegion = { enabled: false, startTick: 0, endTick: 0 };
  private metronomeOn = false;
  /** When a count-in will start the transport; null once started or stopped. */
  private pendingStart: number | null = null;
  private readonly onLoop = (time: number) => this.scheduleAutomation(this.loop.startTick, time);

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
      this.doc = doc;
      transport.bpm.value = doc.meta.bpm;
      this.graph = buildGraph(doc);
      for (const clip of Object.values(doc.clips)) {
        const pattern = doc.patterns[clip.patternId];
        if (pattern) this.syncClip(clip, pattern);
      }
      this.applyLoop();
      if (this.metronomeOn) metronome.arm(doc.meta.timeSig);
      transport.on("loop", this.onLoop);
    });
    return this.starting;
  }

  /** The reconciler works from diffs; this hands the engine the whole picture for rescheduling. */
  setDocument(doc: SongDoc): void {
    this.doc = doc;
  }

  // ---------------------------------------------------------------- transport

  /** Starts after `countInBars` bars of click, so the first bar is played, not chased. */
  play(countInBars = 0): void {
    const transport = Tone.getTransport();
    let at = Tone.now() + 0.05;
    if (countInBars > 0 && this.doc) at = metronome.countIn(countInBars, this.doc.meta.timeSig, this.doc.meta.bpm, at);
    this.pendingStart = at;
    this.scheduleAutomation(transport.ticks, at);
    transport.start(at);
  }

  /** Stopped, every lane parks at its value for the playhead, so live notes sound as that position would. */
  stop(): void {
    metronome.cancelCountIn();
    this.pendingStart = null;
    Tone.getTransport().stop();
    this.holdAutomation();
  }

  /** A seek during a count-in reschedules from the pending start, not from now. */
  seek(tick: number): void {
    Tone.getTransport().ticks = tick;
    const now = Tone.now();
    if (this.isPlaying) this.scheduleAutomation(tick, now);
    else if (this.pendingStart !== null) this.scheduleAutomation(tick, Math.max(now, this.pendingStart));
    else this.holdAutomation();
  }

  get positionTicks(): number {
    return Tone.getTransport().ticks;
  }

  get isPlaying(): boolean {
    const started = Tone.getTransport().state === "started";
    if (started) this.pendingStart = null;
    return started;
  }

  setLoop(loop: LoopRegion): void {
    this.loop = loop;
    if (this.graph) this.applyLoop();
  }

  private applyLoop(): void {
    const transport = Tone.getTransport();
    transport.loop = this.loop.enabled && this.loop.endTick > this.loop.startTick;
    if (transport.loop) {
      transport.loopStart = `${this.loop.startTick}i`;
      transport.loopEnd = `${this.loop.endTick}i`;
    }
  }

  setMetronome(on: boolean): void {
    this.metronomeOn = on;
    if (!this.graph || !this.doc) return;
    if (on) metronome.arm(this.doc.meta.timeSig);
    else metronome.disarm();
  }

  // ------------------------------------------------------------- live input

  noteOn(trackId: string, pitch: number, velocity: number): void {
    this.graph?.tracks.get(trackId)?.voice.attack(pitch, Tone.now(), velocity);
  }

  noteOff(trackId: string, pitch: number): void {
    this.graph?.tracks.get(trackId)?.voice.release(pitch, Tone.now());
  }

  // ------------------------------------------------------------------ meters

  /** Level in dB for a track id or "master", null before audio has started. */
  levelDb(key: string): number | null {
    if (!this.graph) return null;
    const meter = key === "master" ? this.graph.masterMeter : this.graph.tracks.get(key)?.meter;
    if (!meter) return null;
    const value = meter.getValue();
    return typeof value === "number" ? value : Math.max(...value);
  }

  // --------------------------------------------------------------- EngineLike

  setBpm(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
    if (this.isPlaying) this.scheduleAutomation(Tone.getTransport().ticks, Tone.now());
  }

  setTimeSig(timeSig: TimeSig): void {
    if (this.metronomeOn && this.graph) metronome.arm(timeSig);
  }

  setMasterVolume(db: number): void {
    if (this.graph) this.graph.master.volume.value = db;
  }

  addTrack(track: Track, doc: SongDoc): void {
    if (!this.graph) return;
    const nodes = buildTrackNodes(track, this.graph, sampleUrlFor(track, doc));
    this.graph.tracks.set(track.id, nodes);
    if (this.isPlaying) scheduleTrackAutomation(nodes, track, Tone.getTransport().ticks, Tone.now());
  }

  removeTrack(trackId: string): void {
    const nodes = this.graph?.tracks.get(trackId);
    if (!nodes || !this.graph) return;
    disposeTrackNodes(nodes);
    this.graph.tracks.delete(trackId);
  }

  setMix(track: Track): void {
    const nodes = this.graph?.tracks.get(track.id);
    if (nodes) applyMix(nodes, track.mix, track.automation);
  }

  setInstrumentParams(track: Track): void {
    this.graph?.tracks.get(track.id)?.voice.set(resolvedParams(track.instrument));
  }

  rebuildInstrument(track: Track, doc: SongDoc): void {
    const nodes = this.graph?.tracks.get(track.id);
    if (nodes) replaceVoice(nodes, track, sampleUrlFor(track, doc));
  }

  rebuildEffects(track: Track): void {
    const nodes = this.graph?.tracks.get(track.id);
    if (nodes) rebuildEffects(nodes, track.effects);
  }

  setEffectParams(track: Track, effect: Effect): void {
    this.graph?.tracks.get(track.id)?.effects.find((u) => u.id === effect.id)?.set(resolvedEffectParams(effect));
  }

  /** A lane changed: park at the playhead's value (or hand back to the fader), then ramp again if we are playing. */
  setAutomation(track: Track): void {
    const nodes = this.graph?.tracks.get(track.id);
    if (!nodes) return;
    const now = Tone.now();
    const ticks = Tone.getTransport().ticks;
    holdTrackAutomation(nodes, track, ticks, now);
    applyMix(nodes, track.mix, track.automation);
    if (this.isPlaying) scheduleTrackAutomation(nodes, track, ticks, now);
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

  private scheduleAutomation(fromTick: number, at: number): void {
    if (this.graph && this.doc) scheduleAllAutomation(this.graph, this.doc, fromTick, at);
  }

  private holdAutomation(): void {
    if (!this.graph || !this.doc) return;
    const now = Tone.now();
    const ticks = Tone.getTransport().ticks;
    for (const [id, nodes] of this.graph.tracks) {
      const track = this.doc.tracks[id];
      if (track) holdTrackAutomation(nodes, track, ticks, now);
    }
  }

  dispose(): void {
    for (const part of this.parts.values()) part.dispose();
    this.parts.clear();
    metronome.disarm();
    metronome.cancelCountIn();
    Tone.getTransport().off("loop", this.onLoop);
    this.graph?.dispose();
    this.graph = null;
    this.starting = null;
    this.pendingStart = null;
  }
}

export const engine = new AudioEngine();
