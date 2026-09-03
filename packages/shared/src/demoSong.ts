import { emptySong, makeTrack } from "./factory.ts";
import { DRUM_VOICES, STEP_TICKS, ticksPerBar } from "./music.ts";
import * as ops from "./ops.ts";
import type { HpiSwatch } from "./colour.ts";
import type { Note, Pattern, SongDoc } from "./song.ts";

/**
 * The song the database is seeded with and the frontend falls back to offline.
 *
 * Bright synth-pop, 104 BPM, F minor, 36 bars: intro, verse, bridge, hook,
 * verse, hook, outro. Everything is synthesised. The arrangement leans on
 * linked clips on purpose: both verses share one set of patterns, both hooks
 * another, so the timeline shows the ⧉ badges and editing a hook edits both.
 */
export const DEMO_SONG_ID = "demo-synth-pop";

const SIG = [4, 4] as const;
const BAR = ticksPerBar(SIG);
const S = STEP_TICKS;
const BEAT = 4 * S;

// i–VI–III–VII in F minor, one chord per bar, the pop progression.
const CHORDS = {
  Fm: [53, 56, 60],
  Db: [49, 53, 56],
  Ab: [56, 60, 63],
  Eb: [51, 55, 58],
};
const PROGRESSION = [CHORDS.Fm, CHORDS.Db, CHORDS.Ab, CHORDS.Eb];
const ROOTS = [41, 37, 44, 39]; // F1 Db1 Ab1 Eb1

let n = 0;
const note = (pitch: number, start: number, duration: number, velocity = 1): Note => ({ id: `d${n++}`, start, duration, pitch, velocity });
const pattern = (id: string, name: string, kind: Pattern["kind"], bars: number, notes: Note[]): Pattern => ({ id, name, kind, lengthTicks: bars * BAR, notes });

function drumsIntro(): Note[] {
  const out: Note[] = [];
  for (let i = 0; i < 16; i++) out.push(note(DRUM_VOICES.closedHat, i * 2 * S, S, i % 2 ? 0.5 : 0.75));
  out.push(note(DRUM_VOICES.kick, BAR + 3 * BEAT, S, 0.9));
  out.push(note(DRUM_VOICES.clap, BAR + 3 * BEAT + 2 * S, S, 0.8));
  out.push(note(DRUM_VOICES.openHat, BAR + 3 * BEAT + 2 * S, S, 0.7));
  return out;
}

function drumsVerse(): Note[] {
  const out: Note[] = [];
  for (let bar = 0; bar < 4; bar++) {
    const b = bar * BAR;
    for (let beat = 0; beat < 4; beat++) {
      out.push(note(DRUM_VOICES.kick, b + beat * BEAT, S, 1));
      out.push(note(DRUM_VOICES.closedHat, b + beat * BEAT + 2 * S, S, 0.7));
    }
    out.push(note(DRUM_VOICES.clap, b + BEAT, S, 0.9));
    out.push(note(DRUM_VOICES.clap, b + 3 * BEAT, S, 0.9));
    if (bar === 3) out.push(note(DRUM_VOICES.openHat, b + 3 * BEAT + 2 * S, S, 0.7));
  }
  return out;
}

function drumsHook(): Note[] {
  const out: Note[] = [];
  for (let bar = 0; bar < 4; bar++) {
    const b = bar * BAR;
    for (let beat = 0; beat < 4; beat++) {
      out.push(note(DRUM_VOICES.kick, b + beat * BEAT, S, 1));
      out.push(note(DRUM_VOICES.openHat, b + beat * BEAT + 2 * S, S, 0.65));
      out.push(note(DRUM_VOICES.closedHat, b + beat * BEAT, S, 0.5));
    }
    out.push(note(DRUM_VOICES.clap, b + BEAT, S, 1));
    out.push(note(DRUM_VOICES.snare, b + BEAT, S, 0.9));
    out.push(note(DRUM_VOICES.clap, b + 3 * BEAT, S, 1));
    out.push(note(DRUM_VOICES.snare, b + 3 * BEAT, S, 0.9));
    if (bar === 3) {
      out.push(note(DRUM_VOICES.highTom, b + 3 * BEAT, S, 0.8));
      out.push(note(DRUM_VOICES.highTom, b + 3 * BEAT + S, S, 0.7));
      out.push(note(DRUM_VOICES.lowTom, b + 3 * BEAT + 2 * S, S, 0.9));
      out.push(note(DRUM_VOICES.lowTom, b + 3 * BEAT + 3 * S, S, 0.8));
    }
  }
  return out;
}

function drumsBridge(): Note[] {
  return [note(DRUM_VOICES.clap, 3 * BAR + 3 * BEAT, S, 0.7), note(DRUM_VOICES.clap, 3 * BAR + 3 * BEAT + 2 * S, S, 0.9)];
}

function bassVerse(): Note[] {
  const out: Note[] = [];
  ROOTS.forEach((root, bar) => {
    const b = bar * BAR;
    for (let eighth = 0; eighth < 8; eighth++) {
      if (eighth === 5) continue;
      const octaveUp = eighth === 7;
      out.push(note(root + (octaveUp ? 12 : 0), b + eighth * 2 * S, 2 * S, eighth % 2 ? 0.75 : 0.95));
    }
  });
  return out;
}

function bassHook(): Note[] {
  const out: Note[] = [];
  ROOTS.forEach((root, bar) => {
    const b = bar * BAR;
    const line = [0, 0, 7, 0, 12, 0, 7, 10];
    line.forEach((interval, eighth) => out.push(note(root + interval, b + eighth * 2 * S, 2 * S, eighth % 2 ? 0.8 : 1)));
  });
  return out;
}

function bassBridge(): Note[] {
  return [note(37, 0, 2 * BAR, 0.8), note(39, 2 * BAR, 2 * BAR, 0.8)];
}

function guitarVerse(): Note[] {
  const out: Note[] = [];
  PROGRESSION.forEach((chord, bar) => {
    const b = bar * BAR;
    for (const hit of [BEAT + 2 * S, 3 * BEAT + 2 * S]) {
      for (const p of chord) out.push(note(p + 12, b + hit, S, 0.7));
    }
  });
  return out;
}

function guitarHook(): Note[] {
  const out: Note[] = [];
  PROGRESSION.forEach((chord, bar) => {
    const b = bar * BAR;
    for (let eighth = 1; eighth < 8; eighth += 2) {
      for (const p of chord) out.push(note(p + 12, b + eighth * 2 * S, S, eighth === 7 ? 0.9 : 0.7));
    }
  });
  return out;
}

function padIntro(): Note[] {
  return CHORDS.Fm.map((p) => note(p, 0, 2 * BAR, 0.55));
}

function padVerse(): Note[] {
  const out: Note[] = [];
  PROGRESSION.forEach((chord, bar) => chord.forEach((p) => out.push(note(p, bar * BAR, BAR, 0.6))));
  return out;
}

function padBridge(): Note[] {
  return [...CHORDS.Db.map((p) => note(p + 12, 0, 2 * BAR, 0.5)), ...CHORDS.Eb.map((p) => note(p + 12, 2 * BAR, 2 * BAR, 0.6))];
}

function padOutro(): Note[] {
  return CHORDS.Fm.map((p) => note(p, 0, 2 * BAR, 0.5));
}

function brassHook(): Note[] {
  const stab = (chord: number[], at: number, dur: number, vel: number) => chord.map((p) => note(p + 12, at, dur, vel));
  return [
    ...stab(CHORDS.Fm, 0, 2 * S, 1),
    ...stab(CHORDS.Fm, 3 * S, S, 0.8),
    ...stab(CHORDS.Db, BAR + BEAT, 2 * S, 0.9),
    ...stab(CHORDS.Ab, 2 * BAR, 2 * S, 1),
    ...stab(CHORDS.Ab, 2 * BAR + 3 * S, S, 0.8),
    ...stab(CHORDS.Eb, 3 * BAR + BEAT, 4 * S, 1),
    ...stab(CHORDS.Eb, 3 * BAR + 3 * BEAT, 2 * S, 0.9),
  ];
}

function leadHook(): Note[] {
  // F minor pentatonic, up and back over four bars.
  const melody: [number, number, number][] = [
    [77, 0, 3 * S], [75, 3 * S, S], [72, BEAT, 2 * S], [68, BEAT + 2 * S, 2 * S], [72, 2 * BEAT, BEAT], [75, 3 * BEAT, 2 * S], [77, 3 * BEAT + 2 * S, 2 * S],
    [80, BAR, 3 * S], [77, BAR + 3 * S, S], [75, BAR + BEAT, BEAT], [72, BAR + 2 * BEAT, 2 * BEAT],
    [75, 2 * BAR, 2 * S], [77, 2 * BAR + 2 * S, 2 * S], [80, 2 * BAR + BEAT, 2 * S], [84, 2 * BAR + BEAT + 2 * S, 2 * S], [80, 2 * BAR + 2 * BEAT, BEAT], [77, 2 * BAR + 3 * BEAT, BEAT],
    [75, 3 * BAR, 2 * BEAT], [72, 3 * BAR + 2 * BEAT, 2 * BEAT],
  ];
  return melody.map(([p, at, dur]) => note(p, at, dur, 0.85));
}

export function demoSong(): SongDoc {
  n = 0;
  const song = emptySong(DEMO_SONG_ID, "Synth-pop demo");
  song.meta.bpm = 104;

  ops.addTrack(song, makeTrack({ id: "drums", name: "Drums", kind: "drum", colour: { hue: "red", shade: 100 } }));
  ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched", colour: { hue: "orange", shade: 100 }, instrument: { kind: "pluck", params: { dampening: 1400, resonance: 0.95, attackNoise: 0.6 } } }));
  ops.addTrack(song, makeTrack({ id: "guitar", name: "Guitar", kind: "pitched", colour: { hue: "yellow", shade: 100 }, instrument: { kind: "pluck", params: { dampening: 5200, resonance: 0.82, attackNoise: 2.2 } } }));
  ops.addTrack(song, makeTrack({ id: "keys", name: "Keys", kind: "pitched", colour: { hue: "grey", shade: 100 }, instrument: { kind: "poly", params: { cutoff: 1800, spread: 32, attack: 0.35, release: 1.6 } } }));
  ops.addTrack(song, makeTrack({ id: "brass", name: "Brass", kind: "pitched", colour: { hue: "red", shade: 75 }, instrument: { kind: "fm", params: { harmonicity: 3, modulationIndex: 8, attack: 0.03, release: 0.4 } } }));
  ops.addTrack(song, makeTrack({ id: "lead", name: "Lead", kind: "pitched", colour: { hue: "orange", shade: 75 }, instrument: { kind: "poly", params: { cutoff: 6500, spread: 8, attack: 0.01, release: 0.35 } } }));

  ops.setMix(song, "bass", { volume: -3 });
  ops.setMix(song, "guitar", { volume: -9, pan: 0.3 });
  ops.setSend(song, "guitar", "reverb", 0.18);
  ops.setMix(song, "keys", { volume: -8, pan: -0.15 });
  ops.setSend(song, "keys", "reverb", 0.5);
  ops.setMix(song, "brass", { volume: -7, pan: 0.15 });
  ops.setSend(song, "brass", "reverb", 0.2);
  ops.setSend(song, "brass", "delay", 0.2);
  ops.setMix(song, "lead", { volume: -10, pan: -0.25 });
  ops.setSend(song, "lead", "delay", 0.35);
  ops.setSend(song, "lead", "reverb", 0.25);

  const patterns: Pattern[] = [
    pattern("drums-intro", "Intro hats", "drum", 2, drumsIntro()),
    pattern("drums-verse", "Verse beat", "drum", 4, drumsVerse()),
    pattern("drums-bridge", "Bridge pickup", "drum", 4, drumsBridge()),
    pattern("drums-hook", "Hook beat", "drum", 4, drumsHook()),
    pattern("bass-verse", "Verse bass", "pitched", 4, bassVerse()),
    pattern("bass-bridge", "Bridge bass", "pitched", 4, bassBridge()),
    pattern("bass-hook", "Hook bass", "pitched", 4, bassHook()),
    pattern("guitar-verse", "Verse stabs", "pitched", 4, guitarVerse()),
    pattern("guitar-hook", "Hook stabs", "pitched", 4, guitarHook()),
    pattern("pad-intro", "Intro pad", "pitched", 2, padIntro()),
    pattern("pad-verse", "Chords", "pitched", 4, padVerse()),
    pattern("pad-bridge", "Bridge swell", "pitched", 4, padBridge()),
    pattern("pad-outro", "Outro pad", "pitched", 2, padOutro()),
    pattern("brass-hook", "Brass hits", "pitched", 4, brassHook()),
    pattern("lead-hook", "Counter-melody", "pitched", 4, leadHook()),
  ];
  for (const p of patterns) ops.addPattern(song, p);

  // Sections in bars: intro 0-2, verse 2-10, bridge 10-14, hook 14-22, verse 22-30, hook 30-38, outro 38-40.
  const at = (bar: number) => bar * BAR;
  let c = 0;
  const clip = (trackId: string, patternId: string, fromBar: number, toBar: number) =>
    ops.addClip(song, { id: `c${c++}-${patternId}`, trackId, patternId, startTick: at(fromBar), lengthTicks: at(toBar) - at(fromBar), offsetTicks: 0 });

  clip("drums", "drums-intro", 0, 2);
  clip("keys", "pad-intro", 0, 2);

  for (const [from, to] of [[2, 10], [22, 30]] as const) {
    clip("drums", "drums-verse", from, to);
    clip("bass", "bass-verse", from, to);
    clip("guitar", "guitar-verse", from, to);
    clip("keys", "pad-verse", from, to);
  }

  clip("drums", "drums-bridge", 10, 14);
  clip("bass", "bass-bridge", 10, 14);
  clip("keys", "pad-bridge", 10, 14);

  for (const [from, to] of [[14, 22], [30, 38]] as const) {
    clip("drums", "drums-hook", from, to);
    clip("bass", "bass-hook", from, to);
    clip("guitar", "guitar-hook", from, to);
    clip("keys", "pad-verse", from, to);
    clip("brass", "brass-hook", from, to);
  }
  clip("lead", "lead-hook", 30, 38);

  clip("keys", "pad-outro", 38, 40);
  clip("bass", "bass-bridge", 38, 40);

  const grey: HpiSwatch = { hue: "grey", shade: 75 };
  const section = (id: string, name: string, from: number, to: number, colour: HpiSwatch) =>
    ops.addSection(song, { id, name, startTick: at(from), endTick: at(to), colour });
  section("intro", "Intro", 0, 2, grey);
  section("verse1", "Verse", 2, 10, { hue: "red", shade: 75 });
  section("bridge", "Bridge", 10, 14, { hue: "yellow", shade: 75 });
  section("hook1", "Hook", 14, 22, { hue: "orange", shade: 100 });
  section("verse2", "Verse", 22, 30, { hue: "red", shade: 75 });
  section("hook2", "Hook", 30, 38, { hue: "orange", shade: 100 });
  section("outro", "Outro", 38, 40, grey);

  return song;
}
