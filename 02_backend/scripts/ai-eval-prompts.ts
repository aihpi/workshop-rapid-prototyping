// The evaluation set: each prompt has a mechanical check that a reasonable
// interpretation must pass. Loose on purpose; the point is to tell "did what
// was asked" from "did something else", not to grade taste.

import { ticksPerBar } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";

import type { ChatOutcome } from "../src/ai/chat.ts";

export type EvalPrompt = { id: number; text: string; check: (out: ChatOutcome & { ok: true }, before: SongDoc, after: SongDoc) => boolean };

const BAR = ticksPerBar([4, 4]);
const clipsOn = (doc: SongDoc, trackId: string) => Object.values(doc.clips).filter((c) => c.trackId === trackId);
const overlaps = (c: { startTick: number; lengthTicks: number }, fromBar: number, toBar: number) => c.startTick < toBar * BAR && c.startTick + c.lengthTicks > fromBar * BAR;

/** Every note actually heard between two bars, unrolled through clip loops. */
function sounding(doc: SongDoc, fromBar: number, toBar: number): { trackId: string; tick: number; pitch: number; velocity: number }[] {
  const out: { trackId: string; tick: number; pitch: number; velocity: number }[] = [];
  for (const clip of Object.values(doc.clips)) {
    const p = doc.patterns[clip.patternId];
    if (!p) continue;
    for (let base = clip.startTick - clip.offsetTicks; base < clip.startTick + clip.lengthTicks; base += p.lengthTicks) {
      for (const n of p.notes) {
        const tick = base + n.start;
        if (tick < clip.startTick || tick >= clip.startTick + clip.lengthTicks) continue;
        if (tick >= fromBar * BAR && tick < toBar * BAR) out.push({ trackId: clip.trackId, tick, pitch: n.pitch, velocity: n.velocity });
      }
    }
  }
  return out.sort((a, b) => a.tick - b.tick || a.trackId.localeCompare(b.trackId) || a.pitch - b.pitch);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export const PROMPTS: EvalPrompt[] = [
  { id: 1, text: "Set the tempo to 120 BPM", check: (_o, _b, a) => a.meta.bpm === 120 },
  {
    id: 2,
    text: "Make the bass about 4 dB louder",
    check: (_o, b, a) => {
      const v = a.tracks["bass"]?.mix.volume ?? -99;
      const others = Object.keys(b.tracks).filter((id) => id !== "bass");
      return v >= -1 && v <= 3 && others.every((id) => same(a.tracks[id]?.mix, b.tracks[id]?.mix));
    },
  },
  {
    id: 3,
    text: "The drums should sound deeper and stronger",
    check: (_o, b, a) => {
      const d = a.tracks["drums"];
      if (!d) return false;
      const tune = Number(d.instrument.params["tune"] ?? 0);
      const decay = Number(d.instrument.params["decay"] ?? 1);
      return (tune < 0 || decay > 1 || d.mix.volume > 0) && clipsOn(a, "drums").length === clipsOn(b, "drums").length;
    },
  },
  { id: 4, text: "More reverb on the keys and pan them hard left", check: (_o, _b, a) => (a.tracks["keys"]?.mix.sends.reverb ?? 0) > 0.5 && (a.tracks["keys"]?.mix.pan ?? 0) <= -0.7 },
  {
    id: 5,
    text: "Make the bridge more funky",
    check: (_o, b, a) => {
      const inB = sounding(b, 10, 14);
      const inA = sounding(a, 10, 14);
      return !same(inA, inB) && inA.length >= inB.length && same(sounding(a, 0, 10), sounding(b, 0, 10)) && same(sounding(a, 14, 40), sounding(b, 14, 40));
    },
  },
  {
    id: 6,
    text: "The hook should be played by 3 trumpets and a saxophone, create the instruments",
    check: (_o, b, a) => {
      const fresh = Object.values(a.tracks).filter((t) => !b.tracks[t.id] && t.instrument.kind === "fm" && /trump|sax/i.test(t.name));
      if (fresh.length < 4) return false;
      return fresh.every((t) => clipsOn(a, t.id).some((c) => (overlaps(c, 14, 22) || overlaps(c, 30, 38)) && (a.patterns[c.patternId]?.notes.length ?? 0) > 0));
    },
  },
  {
    id: 7,
    text: "The hook should start soft and slowly explode into a fantastic magic concert",
    check: (_o, _b, a) => {
      const start = sounding(a, 14, 15);
      const end = sounding(a, 21, 22);
      const tracks = (xs: typeof start) => new Set(xs.map((x) => x.trackId)).size;
      return mean(start.map((x) => x.velocity)) < mean(end.map((x) => x.velocity)) || tracks(start) < tracks(end);
    },
  },
  {
    id: 8,
    text: "Remove the guitar from the verses but keep it in the hooks",
    check: (_o, _b, a) => {
      const g = clipsOn(a, "guitar");
      const inVerse = g.some((c) => overlaps(c, 2, 10) || overlaps(c, 22, 30));
      const inHook = g.some((c) => overlaps(c, 14, 22)) && g.some((c) => overlaps(c, 30, 38));
      return !inVerse && inHook;
    },
  },
  {
    id: 9,
    text: "Write a new 4-bar drum pattern for the outro with a kick on every beat",
    check: (_o, b, a) => {
      const fresh = Object.values(a.patterns).filter((p) => !b.patterns[p.id] && p.kind === "drum");
      return fresh.some((p) => {
        const bars = Math.round(p.lengthTicks / BAR);
        const kicks = new Set(p.notes.filter((n) => n.pitch === 36).map((n) => n.start));
        for (let bar = 0; bar < bars; bar++) for (let beat = 0; beat < 4; beat++) if (!kicks.has(bar * BAR + (beat * BAR) / 4)) return false;
        return Object.values(a.clips).some((c) => c.patternId === p.id && c.startTick >= 38 * BAR && a.tracks[c.trackId]?.kind === "drum");
      });
    },
  },
  { id: 10, text: "What key is this song in?", check: (o) => o.ops.length === 0 && /f\s*(minor|min\b|m\b)|fm\b/i.test(o.message) },
];
