import { PPQ, ticksPerBar, ticksPerBeat } from "@hpi/shared";
import type { TimeSig } from "@hpi/shared";
import * as Tone from "tone";

import { beatOf, clickTimes } from "./click.ts";

/**
 * The click. Not part of the song graph on purpose: it goes straight to the
 * destination so it is never in a WAV export, and it is armed on the transport
 * so it follows loops, seeks and tempo changes for free.
 */
let synth: Tone.MembraneSynth | null = null;
let repeatId: number | null = null;
let pendingCountIn: number[] = [];

function click(): Tone.MembraneSynth {
  synth ??= new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
  }).connect(Tone.getDestination());
  synth.volume.value = -8;
  return synth;
}

function hit(accent: boolean, time: number): void {
  click().triggerAttackRelease(accent ? 1760 : 1320, 0.03, time, accent ? 1 : 0.7);
}

export function arm(timeSig: TimeSig): void {
  disarm();
  const transport = Tone.getTransport();
  repeatId = transport.scheduleRepeat(
    (time) => hit(beatOf(transport.getTicksAtTime(time), timeSig).accent, time),
    `${ticksPerBeat(timeSig)}i`,
    0,
  );
}

export function disarm(): void {
  if (repeatId !== null) Tone.getTransport().clear(repeatId);
  repeatId = null;
}

/** How far ahead each count-in click is handed to the synth; small, so Stop can still cancel the rest. */
const LOOKAHEAD = 0.05;

/**
 * Plays the count-in from `at` and returns when the transport should start.
 * Clicks are scheduled through the context's timeouts, not pushed onto the
 * synth in one go, so `cancelCountIn` can silence the ones still to come.
 */
export function countIn(bars: number, timeSig: TimeSig, bpm: number, at: number): number {
  cancelCountIn();
  const context = Tone.getContext();
  const now = Tone.now();
  for (const c of clickTimes(bars, timeSig, bpm)) {
    const when = at + c.offsetSec;
    const delay = Math.max(0, when - now - LOOKAHEAD);
    pendingCountIn.push(context.setTimeout(() => hit(c.accent, when), delay));
  }
  return at + ((bars * ticksPerBar(timeSig)) / PPQ) * (60 / bpm);
}

export function cancelCountIn(): void {
  const context = Tone.getContext();
  for (const id of pendingCountIn) context.clearTimeout(id);
  pendingCountIn = [];
}
