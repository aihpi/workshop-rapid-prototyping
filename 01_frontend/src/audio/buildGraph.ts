import type { Mix, SongDoc, Track } from "@hpi/shared";
import * as Tone from "tone";

import { createVoice } from "./instruments.ts";
import type { Voice } from "./instruments.ts";

/**
 * The audio graph for a song, built from the document alone.
 *
 * Nothing here takes a context argument on purpose: every node is created in
 * whatever Tone context is current, so the same function builds the live graph
 * and, inside a `Tone.Offline` callback, the graph the WAV renderer uses. That
 * is the whole reason this is a pure factory and not a set of React effects.
 *
 *   voice -> channel (volume, pan, mute, solo) -> master
 *                  -> reverbSend -> reverb -> master
 *                  -> delaySend  -> delay  -> master
 *   master: compressor -> limiter -> destination
 */
export type TrackNodes = {
  voice: Voice;
  channel: Tone.Channel;
  reverbSend: Tone.Gain;
  delaySend: Tone.Gain;
};

export type Graph = {
  master: Tone.Compressor;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  tracks: Map<string, TrackNodes>;
  /** Resolves once the reverb has generated its impulse response. */
  ready: Promise<void>;
  dispose(): void;
};

export function buildGraph(doc: SongDoc): Graph {
  const limiter = new Tone.Limiter(-1).connect(Tone.getDestination());
  const master = new Tone.Compressor({ threshold: -12, ratio: 3, attack: 0.005, release: 0.1 }).connect(limiter);
  const reverb = new Tone.Reverb({ decay: 2.4, preDelay: 0.02, wet: 1 }).connect(master);
  const delay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.35, wet: 1 }).connect(master);

  const graph: Graph = {
    master,
    reverb,
    delay,
    tracks: new Map(),
    ready: reverb.ready,
    dispose() {
      for (const nodes of graph.tracks.values()) disposeTrackNodes(nodes);
      graph.tracks.clear();
      reverb.dispose();
      delay.dispose();
      master.dispose();
      limiter.dispose();
    },
  };

  for (const trackId of doc.trackOrder) {
    const track = doc.tracks[trackId];
    if (track) graph.tracks.set(trackId, buildTrackNodes(track, graph, sampleUrlFor(track, doc)));
  }
  return graph;
}

export function sampleUrlFor(track: Track, doc: SongDoc): string | undefined {
  return track.instrument.sampleId ? doc.samples[track.instrument.sampleId]?.url : undefined;
}

export function buildTrackNodes(track: Track, graph: Graph, sampleUrl?: string): TrackNodes {
  const channel = new Tone.Channel({ volume: track.mix.volume, pan: track.mix.pan, mute: track.mix.mute, solo: track.mix.solo });
  const reverbSend = new Tone.Gain(track.mix.sends.reverb).connect(graph.reverb);
  const delaySend = new Tone.Gain(track.mix.sends.delay).connect(graph.delay);
  channel.connect(graph.master);
  channel.connect(reverbSend);
  channel.connect(delaySend);

  const voice = createVoice(track.instrument, sampleUrl);
  voice.output.connect(channel);
  return { voice, channel, reverbSend, delaySend };
}

export function applyMix(nodes: TrackNodes, mix: Mix): void {
  nodes.channel.volume.value = mix.volume;
  nodes.channel.pan.value = mix.pan;
  nodes.channel.mute = mix.mute;
  nodes.channel.solo = mix.solo;
  nodes.reverbSend.gain.value = mix.sends.reverb;
  nodes.delaySend.gain.value = mix.sends.delay;
}

/** Swap the voice and keep the channel, so the mixer position is undisturbed. */
export function replaceVoice(nodes: TrackNodes, track: Track, sampleUrl?: string): void {
  nodes.voice.dispose();
  nodes.voice = createVoice(track.instrument, sampleUrl);
  nodes.voice.output.connect(nodes.channel);
}

export function disposeTrackNodes(nodes: TrackNodes): void {
  nodes.voice.dispose();
  nodes.channel.dispose();
  nodes.reverbSend.dispose();
  nodes.delaySend.dispose();
}
