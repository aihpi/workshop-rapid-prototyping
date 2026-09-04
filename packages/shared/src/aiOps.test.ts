import { describe, expect, it } from "vitest";

import { AI_LIMITS, AiOpSchema, applyAiOps } from "./aiOps.ts";
import type { AiOp } from "./aiOps.ts";
import { demoSong } from "./demoSong.ts";
import { STEP_TICKS, ticksPerBar } from "./music.ts";

const BAR = ticksPerBar([4, 4]);
let n = 0;
const newId = () => `n${n++}`;
const run = (ops: AiOp[]) => {
  const doc = demoSong();
  return { doc, ...applyAiOps(doc, ops, newId) };
};

const everyOp: AiOp[] = [
  { op: "setBpm", bpm: 120 },
  { op: "addTrack", id: "sax", name: "Sax", kind: "pitched", instrument: "fm", params: { harmonicity: 2 }, volume: -6, pan: 0.3 },
  { op: "renameTrack", trackId: "bass", name: "Low end" },
  { op: "setInstrument", trackId: "lead", instrument: "pluck" },
  { op: "setInstrumentParam", trackId: "drums", key: "tune", value: -4 },
  { op: "setMix", trackId: "keys", volume: -3, pan: -0.9, reverb: 0.8, delay: 0.1, mute: false, solo: false },
  { op: "addPattern", id: "sax-line", name: "Sax line", kind: "pitched", bars: 2, notes: [{ pitch: 65, step: 0, len: 4 }, { pitch: 68, step: 8, len: 2, vel: 0.5 }] },
  { op: "replaceNotes", patternId: "lead-hook", notes: [{ pitch: 72, step: 0, len: 1 }] },
  { op: "rampVelocity", patternId: "brass-hook", from: 0.2, to: 1 },
  { op: "addClip", id: "sax-clip", trackId: "sax", patternId: "sax-line", bar: 14, bars: 8 },
  { op: "resizeClip", clipId: "sax-clip", bars: 4 },
  { op: "makeUnique", clipId: "c2-drums-verse", newPatternId: "drums-verse-b" },
  { op: "addSection", id: "coda", name: "Coda", bar: 40, bars: 2 },
  { op: "renameSection", sectionId: "hook1", name: "Chorus" },
  { op: "removeClip", clipId: "c4-guitar-verse" },
  { op: "removeTrack", trackId: "brass" },
];

describe("AiOpSchema", () => {
  it("parses every op kind", () => {
    for (const op of everyOp) expect(AiOpSchema.safeParse(op).success, op.op).toBe(true);
  });

  it("rejects unknown ops and bad slugs", () => {
    expect(AiOpSchema.safeParse({ op: "deleteSample", sampleId: "x" }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "addTrack", id: "Sax Track", name: "Sax", kind: "pitched", instrument: "fm" }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "addTrack", id: "sax", name: "Sax", kind: "pitched", instrument: "sampler" }).success).toBe(false);
  });
});

describe("applyAiOps", () => {
  it("applies every op kind against the demo and keeps the batch order", () => {
    const { doc, applied, rejected } = run(everyOp);
    expect(rejected).toEqual([]);
    expect(applied).toHaveLength(everyOp.length);
    expect(doc.meta.bpm).toBe(120);
    expect(doc.tracks["sax"]?.instrument.params).toEqual({ harmonicity: 2 });
    expect(doc.tracks["sax"]?.mix).toMatchObject({ volume: -6, pan: 0.3 });
    expect(doc.tracks["bass"]?.name).toBe("Low end");
    expect(doc.tracks["lead"]?.instrument.kind).toBe("pluck");
    expect(doc.tracks["drums"]?.instrument.params["tune"]).toBe(-4);
    expect(doc.tracks["keys"]?.mix.sends).toEqual({ reverb: 0.8, delay: 0.1 });
    expect(doc.clips["sax-clip"]).toMatchObject({ startTick: 14 * BAR, lengthTicks: 4 * BAR, trackId: "sax", patternId: "sax-line" });
    expect(doc.clips["c2-drums-verse"]?.patternId).toBe("drums-verse-b");
    expect(doc.sections.find((s) => s.id === "hook1")?.name).toBe("Chorus");
    expect(doc.sections.at(-1)).toMatchObject({ id: "coda", startTick: 40 * BAR, endTick: 42 * BAR });
    expect(doc.clips["c4-guitar-verse"]).toBeUndefined();
    expect(doc.tracks["brass"]).toBeUndefined();
    expect(Object.values(doc.clips).some((c) => c.trackId === "brass")).toBe(false);
  });

  it("converts bars and steps to ticks and drops notes past the pattern end", () => {
    const { doc } = run([{ op: "addPattern", id: "p", name: "P", kind: "pitched", bars: 1, notes: [{ pitch: 60, step: 3, len: 2 }, { pitch: 60, step: 16, len: 1 }] }]);
    expect(doc.patterns["p"]?.lengthTicks).toBe(BAR);
    expect(doc.patterns["p"]?.notes).toHaveLength(1);
    expect(doc.patterns["p"]?.notes[0]).toMatchObject({ start: 3 * STEP_TICKS, duration: 2 * STEP_TICKS, velocity: 0.85 });
  });

  it("skips an op with a dangling reference and still applies the rest", () => {
    const { doc, applied, rejected } = run([
      { op: "setMix", trackId: "nope", volume: 0 },
      { op: "setBpm", bpm: 90 },
    ]);
    expect(applied).toHaveLength(1);
    expect(rejected).toEqual([{ index: 0, op: { op: "setMix", trackId: "nope", volume: 0 }, reason: 'no track "nope"' }]);
    expect(doc.meta.bpm).toBe(90);
  });

  it("lets a clip reference a pattern added earlier in the same batch, and refuses kind mismatches", () => {
    const { rejected } = run([
      { op: "addPattern", id: "kick4", name: "Four on the floor", kind: "drum", bars: 1, notes: [{ pitch: 36, step: 0 }] },
      { op: "addClip", id: "k1", trackId: "drums", patternId: "kick4", bar: 38, bars: 2 },
      { op: "addClip", id: "k2", trackId: "bass", patternId: "kick4", bar: 38, bars: 2 },
    ]);
    expect(rejected.map((r) => r.index)).toEqual([2]);
    expect(rejected[0]?.reason).toMatch(/drum but track bass is pitched/);
  });

  it("rejects an unknown param key and clamps an out-of-range value", () => {
    const { doc, rejected } = run([
      { op: "setInstrumentParam", trackId: "drums", key: "cutoff", value: 1 },
      { op: "setInstrumentParam", trackId: "drums", key: "tune", value: -40 },
      { op: "setMix", trackId: "bass", volume: 99, pan: -5, reverb: 2 },
    ]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatch(/kit has no param "cutoff"/);
    expect(doc.tracks["drums"]?.instrument.params["tune"]).toBe(-12);
    expect(doc.tracks["bass"]?.mix).toMatchObject({ volume: 6, pan: -1 });
    expect(doc.tracks["bass"]?.mix.sends.reverb).toBe(1);
  });

  it("rejects an id collision with anything that already exists", () => {
    const { rejected } = run([
      { op: "addTrack", id: "drums", name: "More drums", kind: "drum", instrument: "kit" },
      { op: "addPattern", id: "bass-hook", name: "x", kind: "pitched", bars: 1, notes: [] },
    ]);
    expect(rejected.map((r) => r.reason)).toEqual(['track id "drums" is already taken', 'pattern id "bass-hook" is already taken']);
  });

  it("ramps velocity linearly from the first tick to the last", () => {
    const { doc } = run([
      { op: "addPattern", id: "r", name: "R", kind: "pitched", bars: 1, notes: [{ pitch: 60, step: 0 }, { pitch: 60, step: 8 }, { pitch: 60, step: 15 }] },
      { op: "rampVelocity", patternId: "r", from: 0, to: 1 },
    ]);
    const v = doc.patterns["r"]!.notes.map((n) => n.velocity);
    expect(v[0]).toBe(0);
    expect(v[1]).toBeCloseTo(8 / 15, 2);
    expect(v[2]).toBe(1);
  });

  it("makeUnique mints fresh note ids", () => {
    const { doc } = run([{ op: "makeUnique", clipId: "c0-drums-intro", newPatternId: "intro-b" }]);
    const original = new Set(doc.patterns["drums-intro"]!.notes.map((n) => n.id));
    for (const note of doc.patterns["intro-b"]!.notes) expect(original.has(note.id)).toBe(false);
  });

  it("rejects an oversized batch as a whole and caps new tracks", () => {
    const big = Array.from({ length: AI_LIMITS.ops + 1 }, (): AiOp => ({ op: "setBpm", bpm: 100 }));
    const { doc, applied, rejected } = run(big);
    expect(applied).toEqual([]);
    expect(rejected).toHaveLength(AI_LIMITS.ops + 1);
    expect(doc.meta.bpm).toBe(104);

    const tracks = Array.from({ length: AI_LIMITS.newTracks + 1 }, (_, i): AiOp => ({ op: "addTrack", id: `t${i}`, name: `T${i}`, kind: "pitched", instrument: "fm" }));
    expect(run(tracks).rejected).toHaveLength(1);
  });
});
