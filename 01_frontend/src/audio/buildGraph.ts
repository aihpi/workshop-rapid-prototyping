import { laneIsActive } from "@hpi/shared";
import type { Effect, Mix, SongDoc, Track } from "@hpi/shared";
import * as Tone from "tone";

import { chainReady, createEffectUnit, wireChain } from "./effects.ts";
import type { EffectUnit } from "./effects.ts";
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
 *   voice -> fxIn -> inserts... -> fxOut -> volumeAuto -> channel (volume, pan, mute, solo) -> master
 *                                                  -> reverbSend -> reverb -> master
 *                                                  -> delaySend  -> delay  -> master
 *                                                  -> meter
 *   master: volume -> compressor -> limiter -> destination
 *                                          -> masterMeter
 *
 * `fxIn` and `fxOut` are fixed gains so rebuilding the insert chain never
 * touches the voice or the channel, and swapping the voice never touches the chain.
 */
export type TrackNodes = {
  voice: Voice;
  fxIn: Tone.Gain;
  effects: EffectUnit[];
  fxOut: Tone.Gain;
  /** Volume automation rides here, not on the channel, so mute and the fader never fight the ramps. */
  volumeAuto: Tone.Volume;
  channel: Tone.Channel;
  reverbSend: Tone.Gain;
  delaySend: Tone.Gain;
  meter: Tone.Meter;
};

export type Graph = {
  /** Where every channel and both effect returns land. */
  master: Tone.Volume;
  compressor: Tone.Compressor;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  masterMeter: Tone.Meter;
  tracks: Map<string, TrackNodes>;
  /** Resolves once every reverb has generated its impulse response. */
  ready: Promise<void>;
  dispose(): void;
};

const METER_SMOOTHING = 0.8;

export function buildGraph(doc: SongDoc): Graph {
  const limiter = new Tone.Limiter(-1).connect(Tone.getDestination());
  const masterMeter = new Tone.Meter({ smoothing: METER_SMOOTHING });
  limiter.connect(masterMeter);
  const compressor = new Tone.Compressor({ threshold: -12, ratio: 3, attack: 0.005, release: 0.1 }).connect(limiter);
  const master = new Tone.Volume(doc.meta.masterVolume).connect(compressor);
  const reverb = new Tone.Reverb({ decay: 2.4, preDelay: 0.02, wet: 1 }).connect(master);
  const delay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.35, wet: 1 }).connect(master);

  const graph: Graph = {
    master,
    compressor,
    reverb,
    delay,
    masterMeter,
    tracks: new Map(),
    ready: reverb.ready,
    dispose() {
      for (const nodes of graph.tracks.values()) disposeTrackNodes(nodes);
      graph.tracks.clear();
      reverb.dispose();
      delay.dispose();
      master.dispose();
      compressor.dispose();
      limiter.dispose();
      masterMeter.dispose();
    },
  };

  for (const trackId of doc.trackOrder) {
    const track = doc.tracks[trackId];
    if (track) graph.tracks.set(trackId, buildTrackNodes(track, graph, sampleUrlFor(track, doc)));
  }
  graph.ready = Promise.all([reverb.ready, ...[...graph.tracks.values()].map((n) => chainReady(n.effects))]).then(() => undefined);
  return graph;
}

export function sampleUrlFor(track: Track, doc: SongDoc): string | undefined {
  return track.instrument.sampleId ? doc.samples[track.instrument.sampleId]?.url : undefined;
}

export function buildTrackNodes(track: Track, graph: Graph, sampleUrl?: string): TrackNodes {
  const channel = new Tone.Channel({ volume: track.mix.volume, pan: track.mix.pan, mute: track.mix.mute, solo: track.mix.solo });
  const reverbSend = new Tone.Gain(track.mix.sends.reverb).connect(graph.reverb);
  const delaySend = new Tone.Gain(track.mix.sends.delay).connect(graph.delay);
  const meter = new Tone.Meter({ smoothing: METER_SMOOTHING });
  channel.connect(graph.master);
  channel.connect(reverbSend);
  channel.connect(delaySend);
  channel.connect(meter);

  const fxIn = new Tone.Gain(1);
  const volumeAuto = new Tone.Volume(0).connect(channel);
  const fxOut = new Tone.Gain(1).connect(volumeAuto);
  const voice = createVoice(track.instrument, sampleUrl, track.kind);
  voice.output.connect(fxIn);

  const nodes: TrackNodes = { voice, fxIn, effects: [], fxOut, volumeAuto, channel, reverbSend, delaySend, meter };
  rebuildEffects(nodes, track.effects);
  applyMix(nodes, track.mix, track.automation);
  return nodes;
}

/**
 * Pushes fader values into the nodes, except where an automation lane owns the
 * parameter: there the scheduled ramps are the truth and a fader write would
 * fight them. A volume lane replaces the fader, so the channel sits at unity
 * while the lane drives `volumeAuto`; without a lane it is the other way round.
 */
export function applyMix(nodes: TrackNodes, mix: Mix, automation: Track["automation"] = {}): void {
  const volumeLane = laneIsActive(automation["volume"]);
  nodes.channel.volume.value = volumeLane ? 0 : mix.volume;
  if (!volumeLane) nodes.volumeAuto.volume.value = 0;
  if (!laneIsActive(automation["pan"])) nodes.channel.pan.value = mix.pan;
  nodes.channel.mute = mix.mute;
  nodes.channel.solo = mix.solo;
  if (!laneIsActive(automation["sendReverb"])) nodes.reverbSend.gain.value = mix.sends.reverb;
  if (!laneIsActive(automation["sendDelay"])) nodes.delaySend.gain.value = mix.sends.delay;
}

/** Swap the voice and keep everything downstream, so the mixer position is undisturbed. */
export function replaceVoice(nodes: TrackNodes, track: Track, sampleUrl?: string): void {
  nodes.voice.dispose();
  nodes.voice = createVoice(track.instrument, sampleUrl, track.kind);
  nodes.voice.output.connect(nodes.fxIn);
}

/** Tears the insert chain down and builds it again from the enabled effects, in order. */
export function rebuildEffects(nodes: TrackNodes, effects: readonly Effect[]): void {
  for (const unit of nodes.effects) unit.dispose();
  nodes.effects = effects.filter((e) => e.enabled).map(createEffectUnit);
  wireChain(nodes.fxIn, nodes.effects, nodes.fxOut);
}

export function disposeTrackNodes(nodes: TrackNodes): void {
  nodes.voice.dispose();
  for (const unit of nodes.effects) unit.dispose();
  nodes.fxIn.dispose();
  nodes.fxOut.dispose();
  nodes.volumeAuto.dispose();
  nodes.channel.dispose();
  nodes.reverbSend.dispose();
  nodes.delaySend.dispose();
  nodes.meter.dispose();
}
