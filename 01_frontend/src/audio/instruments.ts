import { DRUM_VOICES } from "@hpi/shared";
import type { Instrument } from "@hpi/shared";
import * as Tone from "tone";

import { resolvedParams } from "@hpi/shared";

/**
 * One playable instrument behind a uniform interface, so the scheduler and the
 * mixer never care which Tone class is inside. Every voice here is persistent:
 * no node is created per note, which is what keeps the graph from growing.
 */
export interface Voice {
  readonly output: Tone.ToneAudioNode;
  trigger(pitch: number, time: number, velocity: number, durationSec: number): void;
  /** Live input: a key went down and nobody knows yet how long it will be held. */
  attack(pitch: number, time: number, velocity: number): void;
  release(pitch: number, time: number): void;
  set(params: Record<string, number>): void;
  dispose(): void;
}

/** Percussive voices have no sustain to release, so a held key is one short hit. */
const ONE_SHOT_SECONDS = 0.25;

const hz = (midi: number): number => Tone.Frequency(midi, "midi").toFrequency();

/** Only the keys that are actually set, so optional Tone options never receive `undefined`. */
function present(params: Record<string, number>, keys: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------- drum kit

type Drum =
  | { kind: "membrane"; synth: Tone.MembraneSynth; freq: number; baseDecay: number }
  | { kind: "noise"; synth: Tone.NoiseSynth; filter: Tone.Filter; baseDecay: number }
  | { kind: "metal"; synth: Tone.MetalSynth; freq: number; baseDecay: number };

class KitVoice implements Voice {
  readonly output = new Tone.Gain(0.9);
  private readonly drums = new Map<number, Drum>();
  private tuneRatio = 1;

  constructor() {
    const membrane = (freq: number, decay: number, opts: Partial<Tone.MembraneSynthOptions>): Drum => {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay, sustain: 0.01, release: 0.4 },
        ...opts,
      }).connect(this.output);
      return { kind: "membrane", synth, freq, baseDecay: decay };
    };
    const noise = (type: "white" | "pink", decay: number, filterType: "highpass" | "bandpass", cutoff: number): Drum => {
      const filter = new Tone.Filter({ type: filterType, frequency: cutoff, Q: 0.8 }).connect(this.output);
      const synth = new Tone.NoiseSynth({
        noise: { type },
        envelope: { attack: 0.001, decay, sustain: 0, release: 0.02 },
      }).connect(filter);
      return { kind: "noise", synth, filter, baseDecay: decay };
    };
    const metal = (decay: number): Drum => {
      const synth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay, release: 0.02 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).connect(this.output);
      synth.volume.value = -14;
      return { kind: "metal", synth, freq: 250, baseDecay: decay };
    };

    this.drums.set(DRUM_VOICES.kick, membrane(hz(36), 0.45, { pitchDecay: 0.06, octaves: 8 }));
    this.drums.set(DRUM_VOICES.snare, noise("pink", 0.18, "bandpass", 1800));
    this.drums.set(DRUM_VOICES.clap, noise("white", 0.12, "highpass", 1200));
    this.drums.set(DRUM_VOICES.closedHat, metal(0.05));
    this.drums.set(DRUM_VOICES.openHat, metal(0.35));
    this.drums.set(DRUM_VOICES.lowTom, membrane(hz(45), 0.3, { pitchDecay: 0.08, octaves: 3 }));
    this.drums.set(DRUM_VOICES.highTom, membrane(hz(52), 0.25, { pitchDecay: 0.08, octaves: 3 }));
  }

  trigger(pitch: number, time: number, velocity: number, durationSec: number): void {
    const drum = this.drums.get(pitch);
    if (!drum) return;
    switch (drum.kind) {
      case "membrane":
        drum.synth.triggerAttackRelease(drum.freq * this.tuneRatio, durationSec, time, velocity);
        return;
      case "metal":
        drum.synth.triggerAttackRelease(drum.freq * this.tuneRatio, durationSec, time, velocity);
        return;
      case "noise":
        // NoiseSynth has no pitch, so its signature drops the note argument.
        drum.synth.triggerAttackRelease(durationSec, time, velocity);
        return;
    }
  }

  attack(pitch: number, time: number, velocity: number): void {
    this.trigger(pitch, time, velocity, ONE_SHOT_SECONDS);
  }

  release(): void {}

  set(params: Record<string, number>): void {
    this.tuneRatio = Math.pow(2, (params["tune"] ?? 0) / 12);
    const decay = params["decay"] ?? 1;
    for (const drum of this.drums.values()) drum.synth.envelope.decay = drum.baseDecay * decay;
  }

  dispose(): void {
    for (const drum of this.drums.values()) {
      drum.synth.dispose();
      if (drum.kind === "noise") drum.filter.dispose();
    }
    this.output.dispose();
  }
}

// ------------------------------------------------------------------- pluck

/**
 * Karplus-Strong for guitar and bass. PluckSynth is not Monophonic, so
 * Tone.PolySynth cannot wrap it; a small round-robin pool does the same job.
 */
class PluckVoice implements Voice {
  readonly output = new Tone.Gain(1.4);
  private readonly voices: Tone.PluckSynth[] = [];
  private next = 0;

  constructor(size = 6) {
    for (let i = 0; i < size; i++) {
      this.voices.push(new Tone.PluckSynth({ attackNoise: 1, dampening: 3000, resonance: 0.9, release: 1 }).connect(this.output));
    }
  }

  trigger(pitch: number, time: number, velocity: number, durationSec: number): void {
    const voice = this.voices[this.next++ % this.voices.length]!;
    voice.triggerAttackRelease(hz(pitch), durationSec, time, velocity);
  }

  attack(pitch: number, time: number, velocity: number): void {
    this.trigger(pitch, time, velocity, 1);
  }

  release(): void {}

  set(params: Record<string, number>): void {
    for (const v of this.voices) {
      if (params["dampening"] !== undefined) v.dampening = params["dampening"];
      if (params["resonance"] !== undefined) v.resonance = params["resonance"];
      if (params["attackNoise"] !== undefined) v.attackNoise = params["attackNoise"];
    }
  }

  dispose(): void {
    for (const v of this.voices) v.dispose();
    this.output.dispose();
  }
}

// -------------------------------------------------------------------- brass

class FmVoice implements Voice {
  readonly output = new Tone.Gain(0.7);
  private readonly poly: Tone.PolySynth<Tone.FMSynth>;

  constructor() {
    this.poly = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: "sawtooth" },
      modulation: { type: "square" },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.5 },
      modulationEnvelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.5 },
    }).connect(this.output);
    this.poly.maxPolyphony = 8;
  }

  trigger(pitch: number, time: number, velocity: number, durationSec: number): void {
    this.poly.triggerAttackRelease(hz(pitch), durationSec, time, velocity);
  }

  attack(pitch: number, time: number, velocity: number): void {
    this.poly.triggerAttack(hz(pitch), time, velocity);
  }

  release(pitch: number, time: number): void {
    this.poly.triggerRelease(hz(pitch), time);
  }

  set(params: Record<string, number>): void {
    this.poly.set({
      ...present(params, ["harmonicity", "modulationIndex"]),
      envelope: present(params, ["attack", "release"]),
    });
  }

  dispose(): void {
    this.poly.dispose();
    this.output.dispose();
  }
}

// --------------------------------------------------------------- keys / pad

class PolyVoice implements Voice {
  readonly output = new Tone.Gain(0.6);
  private readonly filter = new Tone.Filter({ type: "lowpass", frequency: 2500, Q: 0.7, rolloff: -24 }).connect(this.output);
  private readonly poly: Tone.PolySynth<Tone.Synth>;

  constructor() {
    this.poly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.8 },
    }).connect(this.filter);
    this.poly.maxPolyphony = 12;
  }

  trigger(pitch: number, time: number, velocity: number, durationSec: number): void {
    this.poly.triggerAttackRelease(hz(pitch), durationSec, time, velocity);
  }

  attack(pitch: number, time: number, velocity: number): void {
    this.poly.triggerAttack(hz(pitch), time, velocity);
  }

  release(pitch: number, time: number): void {
    this.poly.triggerRelease(hz(pitch), time);
  }

  set(params: Record<string, number>): void {
    if (params["cutoff"] !== undefined) this.filter.frequency.value = params["cutoff"];
    this.poly.set({
      oscillator: present(params, ["spread"]) as Partial<Tone.SynthOptions["oscillator"]>,
      envelope: present(params, ["attack", "release"]),
    });
  }

  dispose(): void {
    this.poly.dispose();
    this.filter.dispose();
    this.output.dispose();
  }
}

// ------------------------------------------------------------------ sampler

/**
 * One recorded sample. On a pitched track Tone.Sampler repitches it across the
 * keyboard from C4; on a drum track every lane plays it as recorded, because a
 * GM drum number is a lane, not a pitch.
 */
class SamplerVoice implements Voice {
  readonly output = new Tone.Gain(1);
  private readonly sampler: Tone.Sampler;

  constructor(
    url: string,
    private readonly fixedPitch: boolean,
  ) {
    this.sampler = new Tone.Sampler({ urls: { C4: url }, attack: 0, release: 0.3 }).connect(this.output);
  }

  trigger(pitch: number, time: number, velocity: number, durationSec: number): void {
    if (!this.sampler.loaded) return;
    this.sampler.triggerAttackRelease(hz(this.fixedPitch ? 60 : pitch), Math.max(durationSec, 0.25), time, velocity);
  }

  attack(pitch: number, time: number, velocity: number): void {
    if (this.sampler.loaded) this.sampler.triggerAttack(hz(this.fixedPitch ? 60 : pitch), time, velocity);
  }

  release(pitch: number, time: number): void {
    if (this.sampler.loaded) this.sampler.triggerRelease(hz(this.fixedPitch ? 60 : pitch), time);
  }

  set(params: Record<string, number>): void {
    if (params["attack"] !== undefined) this.sampler.attack = params["attack"];
    if (params["release"] !== undefined) this.sampler.release = params["release"];
  }

  dispose(): void {
    this.sampler.dispose();
    this.output.dispose();
  }
}

/** A sampler track with no sample assigned yet. */
class SilentVoice implements Voice {
  readonly output = new Tone.Gain(0);
  trigger(): void {}
  attack(): void {}
  release(): void {}
  set(): void {}
  dispose(): void {
    this.output.dispose();
  }
}

// ------------------------------------------------------------------ factory

export function createVoice(instrument: Instrument, sampleUrl?: string, trackKind: "drum" | "pitched" = "pitched"): Voice {
  let voice: Voice;
  switch (instrument.kind) {
    case "kit":
      voice = new KitVoice();
      break;
    case "pluck":
      voice = new PluckVoice();
      break;
    case "fm":
      voice = new FmVoice();
      break;
    case "poly":
      voice = new PolyVoice();
      break;
    case "sampler":
      voice = sampleUrl ? new SamplerVoice(sampleUrl, trackKind === "drum") : new SilentVoice();
      break;
  }
  voice.set(resolvedParams(instrument));
  return voice;
}
