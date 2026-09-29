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
  { op: "addEffect", trackId: "bass", id: "bass-eq", kind: "eq3", params: { low: 3 } },
  { op: "setEffectParam", trackId: "bass", effectId: "bass-eq", key: "high", value: -2 },
  { op: "setEffectEnabled", trackId: "bass", effectId: "bass-eq", enabled: false },
  { op: "removeEffect", trackId: "drums", effectId: "drums-comp" },
  { op: "setAutomation", trackId: "lead", param: "pan", points: [{ bar: 30, value: -1 }, { bar: 34, step: 8, value: 1 }] },
  { op: "quantiseNotes", patternId: "lead-hook", grid: "1/8" },
  { op: "removeClip", clipId: "c4-guitar-verse" },
  { op: "removeTrack", trackId: "brass" },
  // Last, so the bar arithmetic asserted above still uses 4/4.
  { op: "setTimeSig", beats: 3, unit: 4 },
];

describe("AiOpSchema", () => {
  it("parses every op kind", () => {
    for (const op of everyOp) expect(AiOpSchema.safeParse(op).success, op.op).toBe(true);
  });

  it("rejects unknown ops and bad slugs", () => {
    expect(AiOpSchema.safeParse({ op: "deleteSample", sampleId: "x" }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "addTrack", id: "Sax Track", name: "Sax", kind: "pitched", instrument: "fm" }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "addTrack", id: "sax", name: "Sax", kind: "pitched", instrument: "sampler" }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "addEffect", trackId: "drums", id: "x", kind: "phaser" }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "setTimeSig", beats: 0, unit: 4 }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "setTimeSig", beats: 4, unit: 16 }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "setAutomation", trackId: "keys", param: "cutoff", points: [] }).success).toBe(false);
    expect(AiOpSchema.safeParse({ op: "quantiseNotes", patternId: "p", grid: "1/32" }).success).toBe(false);
  });

  it("caps automation points per lane", () => {
    const points = (n: number) => Array.from({ length: n }, (_, bar) => ({ bar, value: 0 }));
    expect(AiOpSchema.safeParse({ op: "setAutomation", trackId: "keys", param: "volume", points: points(AI_LIMITS.automationPoints) }).success).toBe(true);
    expect(AiOpSchema.safeParse({ op: "setAutomation", trackId: "keys", param: "volume", points: points(AI_LIMITS.automationPoints + 1) }).success).toBe(false);
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
    expect(doc.tracks["bass"]?.effects).toEqual([{ id: "bass-eq", kind: "eq3", enabled: false, params: { low: 3, high: -2 } }]);
    expect(doc.tracks["drums"]?.effects).toEqual([]);
    expect(doc.tracks["lead"]?.automation["pan"]?.points).toEqual([
      { tick: 30 * BAR, value: -1 },
      { tick: 34 * BAR + 8 * STEP_TICKS, value: 1 },
    ]);
    expect(doc.meta.timeSig).toEqual([3, 4]);
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

  it("rejects an id collision with anything that already exists, effects included", () => {
    const { rejected } = run([
      { op: "addTrack", id: "drums", name: "More drums", kind: "drum", instrument: "kit" },
      { op: "addPattern", id: "bass-hook", name: "x", kind: "pitched", bars: 1, notes: [] },
      { op: "addEffect", trackId: "bass", id: "drums-comp", kind: "compressor" },
      { op: "addEffect", trackId: "bass", id: "keys", kind: "reverb" },
      { op: "addPattern", id: "drums-comp", name: "x", kind: "drum", bars: 1, notes: [] },
    ]);
    expect(rejected.map((r) => r.reason)).toEqual([
      'track id "drums" is already taken',
      'pattern id "bass-hook" is already taken',
      'effect id "drums-comp" is already taken',
      'effect id "keys" is already taken',
      'pattern id "drums-comp" is already taken',
    ]);
  });

  it("clamps effect params to their spec and rejects unknown keys and bad choices", () => {
    const { doc, rejected } = run([
      { op: "addEffect", trackId: "keys", id: "keys-filter", kind: "filter", params: { frequency: 50000, type: "lowpass" } },
      { op: "setEffectParam", trackId: "keys", effectId: "keys-filter", key: "cutoff", value: 1 },
      { op: "setEffectParam", trackId: "keys", effectId: "keys-filter", key: "type", value: "notch" },
      { op: "setEffectParam", trackId: "keys", effectId: "keys-filter", key: "Q", value: "high" },
      { op: "setEffectParam", trackId: "keys", effectId: "keys-filter", key: "Q", value: -3 },
      { op: "setEffectParam", trackId: "keys", effectId: "nope", key: "Q", value: 1 },
      { op: "addEffect", trackId: "keys", id: "keys-eq", kind: "eq3", params: { low: 99, warmth: 1 } },
    ]);
    expect(rejected.map((r) => r.index)).toEqual([1, 2, 3, 5, 6]);
    expect(rejected[0]?.reason).toBe('filter has no param "cutoff" (has frequency, Q, type)');
    expect(rejected[1]?.reason).toBe("filter type must be one of lowpass, highpass, bandpass");
    expect(rejected[2]?.reason).toBe("filter Q takes a number");
    expect(rejected[3]?.reason).toBe('track keys has no effect "nope"');
    expect(rejected[4]?.reason).toBe('eq3 has no param "warmth" (has low, mid, high, lowFrequency, highFrequency)');
    expect(doc.tracks["keys"]?.effects).toEqual([{ id: "keys-filter", kind: "filter", enabled: true, params: { frequency: 20000, type: "lowpass", Q: 0.1 } }]);
  });

  it("caps effects per track", () => {
    const many = Array.from({ length: AI_LIMITS.effectsPerTrack + 1 }, (_, i): AiOp => ({ op: "addEffect", trackId: "bass", id: `fx${i}`, kind: "chorus" }));
    const { doc, rejected } = run(many);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatch(/already has 6 effects/);
    expect(doc.tracks["bass"]?.effects).toHaveLength(AI_LIMITS.effectsPerTrack);
  });

  it("clamps and sorts automation points, and an empty list clears the lane", () => {
    const { doc } = run([{ op: "setAutomation", trackId: "bass", param: "volume", points: [{ bar: 4, value: 20 }, { bar: 0, step: 8, value: -90 }] }]);
    expect(doc.tracks["bass"]?.automation["volume"]?.points).toEqual([
      { tick: 8 * STEP_TICKS, value: -60 },
      { tick: 4 * BAR, value: 6 },
    ]);
    const cleared = run([{ op: "setAutomation", trackId: "keys", param: "volume", points: [] }]);
    expect(cleared.rejected).toEqual([]);
    expect(cleared.doc.tracks["keys"]?.automation["volume"]).toBeUndefined();
  });

  it("setTimeSig changes the bar length for the ops after it", () => {
    const { doc, rejected } = run([
      { op: "setTimeSig", beats: 3, unit: 4 },
      { op: "addPattern", id: "waltz", name: "Waltz", kind: "pitched", bars: 1, notes: [{ pitch: 60, step: 0 }] },
      { op: "addClip", id: "waltz-clip", trackId: "keys", patternId: "waltz", bar: 2, bars: 2 },
    ]);
    const BAR34 = ticksPerBar([3, 4]);
    expect(rejected).toEqual([]);
    expect(doc.meta.timeSig).toEqual([3, 4]);
    expect(doc.patterns["waltz"]?.lengthTicks).toBe(BAR34);
    expect(doc.clips["waltz-clip"]).toMatchObject({ startTick: 2 * BAR34, lengthTicks: 2 * BAR34 });
  });

  it("quantises every note to the grid, fully or halfway", () => {
    const late = (): AiOp[] => [{ op: "addPattern", id: "q", name: "Q", kind: "pitched", bars: 1, notes: [{ pitch: 60, step: 3 }] }];
    const start = (r: ReturnType<typeof run>) => r.doc.patterns["q"]?.notes[0]?.start;
    expect(start(run([...late(), { op: "quantiseNotes", patternId: "q", grid: "1/4" }]))).toBe(4 * STEP_TICKS);
    expect(start(run([...late(), { op: "quantiseNotes", patternId: "q", grid: "1/4", strength: 0.5 }]))).toBe(3.5 * STEP_TICKS);
    expect(start(run([...late(), { op: "quantiseNotes", patternId: "q" }]))).toBe(3 * STEP_TICKS);
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
