// The vocabulary the AI assistant speaks: a JSON list of edits in the app's own
// terms, validated with zod on the server and applied on the client inside one
// `produce()`. Time is bars and sixteenth steps, never ticks, and the model
// never sees note ids; both were the main sources of invalid output in trials.
// Numeric ranges are clamped rather than rejected so a slightly-off value still
// lands. Samples are deliberately absent from this vocabulary.

import { z } from "zod";

import { AUTOMATION_RANGES } from "./automation.ts";
import { swatchForIndex } from "./colour.ts";
import { EFFECT_SPECS, isChoiceSpec } from "./effectSpecs.ts";
import { makeTrack } from "./factory.ts";
import { INSTRUMENT_SPECS } from "./instrumentSpecs.ts";
import { PPQ, STEP_TICKS, ticksPerBar } from "./music.ts";
import * as ops from "./ops.ts";
import type { EffectKind, InstrumentKind, Note, Pattern, SongDoc, Track } from "./song.ts";
import { EffectKindSchema, InstrumentKindSchema, MIX_AUTOMATION_PARAMS, TrackKindSchema } from "./song.ts";

export const AI_LIMITS = { ops: 40, newTracks: 8, notesPerPattern: 256, clipBars: 64, effectsPerTrack: 6, automationPoints: 64 } as const;

const slug = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,39}$/, "ids are lowercase slugs");
const ref = z.string().min(1);
const name = z.string().min(1).max(60);
const bar = z.number().int().min(0).max(1024);
const bars = z.number().int().min(1).max(AI_LIMITS.clipBars);
const level = z.number();

const AiInstrumentKind = InstrumentKindSchema.exclude(["sampler"]);

/** Effect params are numbers except the filter type, which is a named choice. */
const effectValue = z.union([z.number(), z.string()]);
const effectParams = z.record(z.string(), effectValue);

/** Quantise grids in note values; the model thinks in those, not in ticks. */
const AiGrid = z.enum(["1/4", "1/8", "1/16"]);
const GRID_TICKS: Record<z.infer<typeof AiGrid>, number> = { "1/4": PPQ, "1/8": PPQ / 2, "1/16": STEP_TICKS };

export const AiAutomationPointSchema = z.object({
  bar,
  /** Sixteenth steps into the bar, default 0. */
  step: z.number().int().min(0).optional(),
  value: level,
});

export const AiNoteSchema = z.object({
  pitch: z.number().int().min(0).max(127),
  /** Sixteenth steps from the start of the pattern. */
  step: z.number().int().min(0),
  /** Length in steps, default 1. */
  len: z.number().int().min(1).optional(),
  vel: z.number().optional(),
});

const notes = z.array(AiNoteSchema).max(AI_LIMITS.notesPerPattern);

export const AiOpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("setBpm"), bpm: level }),
  z.object({
    op: z.literal("addTrack"),
    id: slug,
    name,
    kind: TrackKindSchema,
    instrument: AiInstrumentKind,
    params: z.record(z.string(), z.number()).optional(),
    volume: level.optional(),
    pan: level.optional(),
  }),
  z.object({ op: z.literal("renameTrack"), trackId: ref, name }),
  z.object({ op: z.literal("removeTrack"), trackId: ref }),
  z.object({ op: z.literal("setInstrument"), trackId: ref, instrument: AiInstrumentKind, params: z.record(z.string(), z.number()).optional() }),
  z.object({ op: z.literal("setInstrumentParam"), trackId: ref, key: z.string(), value: level }),
  z.object({
    op: z.literal("setMix"),
    trackId: ref,
    volume: level.optional(),
    pan: level.optional(),
    mute: z.boolean().optional(),
    solo: z.boolean().optional(),
    reverb: level.optional(),
    delay: level.optional(),
  }),
  z.object({ op: z.literal("addPattern"), id: slug, name, kind: TrackKindSchema, bars, notes }),
  z.object({ op: z.literal("replaceNotes"), patternId: ref, notes }),
  z.object({ op: z.literal("rampVelocity"), patternId: ref, from: level, to: level }),
  z.object({ op: z.literal("addClip"), id: slug, trackId: ref, patternId: ref, bar, bars }),
  z.object({ op: z.literal("resizeClip"), clipId: ref, bars }),
  z.object({ op: z.literal("removeClip"), clipId: ref }),
  z.object({ op: z.literal("makeUnique"), clipId: ref, newPatternId: slug }),
  z.object({ op: z.literal("addSection"), id: slug, name, bar, bars }),
  z.object({ op: z.literal("renameSection"), sectionId: ref, name }),
  z.object({ op: z.literal("addEffect"), trackId: ref, id: slug, kind: EffectKindSchema, params: effectParams.optional(), enabled: z.boolean().optional() }),
  z.object({ op: z.literal("removeEffect"), trackId: ref, effectId: ref }),
  z.object({ op: z.literal("setEffectParam"), trackId: ref, effectId: ref, key: z.string(), value: effectValue }),
  z.object({ op: z.literal("setEffectEnabled"), trackId: ref, effectId: ref, enabled: z.boolean() }),
  z.object({ op: z.literal("setTimeSig"), beats: z.number().int().min(1).max(16), unit: z.union([z.literal(4), z.literal(8)]) }),
  z.object({
    op: z.literal("setAutomation"),
    trackId: ref,
    param: z.enum(MIX_AUTOMATION_PARAMS),
    /** Replaces the whole lane; an empty list clears it. */
    points: z.array(AiAutomationPointSchema).max(AI_LIMITS.automationPoints),
  }),
  z.object({ op: z.literal("quantiseNotes"), patternId: ref, grid: AiGrid.optional(), strength: z.number().min(0).max(1).optional() }),
]);

export type AiOp = z.infer<typeof AiOpSchema>;
export type AiOpName = AiOp["op"];

export const AiResponseSchema = z.object({
  /** A short plan. Asking for it measurably helps mid-size models with multi-op edits. */
  thoughts: z.string().max(600).optional(),
  message: z.string(),
  ops: z.array(AiOpSchema),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;

export type AiRejected = { index: number; op: AiOp; reason: string };
export type AiApplyResult = { applied: AiOp[]; rejected: AiRejected[] };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

class Reject extends Error {}

function clampParams(kind: InstrumentKind, params: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(params)) {
    const spec = INSTRUMENT_SPECS[kind].find((s) => s.key === key);
    if (!spec) throw new Reject(`${kind} has no param "${key}" (has ${INSTRUMENT_SPECS[kind].map((s) => s.key).join(", ")})`);
    out[key] = clamp(value, spec.min, spec.max);
  }
  return out;
}

/** The effect twin of `clampParams`; a choice param is validated rather than clamped. */
function clampEffectParams(kind: EffectKind, params: Record<string, number | string>): Record<string, number | string> {
  const specs = EFFECT_SPECS[kind];
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(params)) {
    const spec = specs.find((s) => s.key === key);
    if (!spec) throw new Reject(`${kind} has no param "${key}" (has ${specs.map((s) => s.key).join(", ")})`);
    if (isChoiceSpec(spec)) {
      if (typeof value !== "string" || !spec.choices.includes(value)) throw new Reject(`${kind} ${key} must be one of ${spec.choices.join(", ")}`);
      out[key] = value;
    } else {
      if (typeof value !== "number") throw new Reject(`${kind} ${key} takes a number`);
      out[key] = clamp(value, spec.min, spec.max);
    }
  }
  return out;
}

function toNotes(input: z.infer<typeof AiNoteSchema>[], lengthTicks: number, newId: () => string): Note[] {
  const out: Note[] = [];
  for (const n of input) {
    const start = n.step * STEP_TICKS;
    // Notes past the end are dropped, the same rule `setPatternLength` uses.
    if (start >= lengthTicks) continue;
    out.push({ id: newId(), start, duration: (n.len ?? 1) * STEP_TICKS, pitch: n.pitch, velocity: clamp(n.vel ?? 0.85, 0, 1) });
  }
  return out;
}

/**
 * Applies a validated batch to the document it is given, in order, skipping
 * and recording any op whose references do not hold. Later ops may refer to
 * ids introduced earlier in the same batch. Never throws for model mistakes;
 * the caller shows `rejected` and keeps `applied` as the undo step's content.
 */
export function applyAiOps(doc: SongDoc, batch: AiOp[], newId: () => string): AiApplyResult {
  const result: AiApplyResult = { applied: [], rejected: [] };
  if (batch.length > AI_LIMITS.ops) {
    result.rejected = batch.map((op, index) => ({ index, op, reason: `batch has ${batch.length} ops, the limit is ${AI_LIMITS.ops}` }));
    return result;
  }
  // Read afresh per op: a setTimeSig earlier in the batch changes the bar length for the rest.
  const BAR = () => ticksPerBar(doc.meta.timeSig);
  let newTracks = 0;

  const track = (id: string) => doc.tracks[id] ?? raise(`no track "${id}"`);
  const pattern = (id: string) => doc.patterns[id] ?? raise(`no pattern "${id}"`);
  const clip = (id: string) => doc.clips[id] ?? raise(`no clip "${id}"`);
  const effect = (t: Track, id: string) => t.effects.find((e) => e.id === id) ?? raise(`track ${t.id} has no effect "${id}"`);
  const fresh = (id: string, kind: string) => {
    const effectIds = Object.values(doc.tracks).some((t) => t.effects.some((e) => e.id === id));
    if (doc.tracks[id] || doc.patterns[id] || doc.clips[id] || doc.sections.some((s) => s.id === id) || effectIds) raise(`${kind} id "${id}" is already taken`);
  };

  batch.forEach((op, index) => {
    try {
      apply(op);
      result.applied.push(op);
    } catch (e) {
      if (!(e instanceof Reject)) throw e;
      result.rejected.push({ index, op, reason: e.message });
    }
  });
  return result;

  function apply(op: AiOp): void {
    switch (op.op) {
      case "setBpm":
        return ops.setBpm(doc, clamp(op.bpm, 20, 300));
      case "addTrack": {
        fresh(op.id, "track");
        if (++newTracks > AI_LIMITS.newTracks) raise(`at most ${AI_LIMITS.newTracks} new tracks per request`);
        if ((op.kind === "drum") !== (op.instrument === "kit")) raise(`kind ${op.kind} needs ${op.kind === "drum" ? "the kit" : "a pitched"} instrument`);
        const t = makeTrack({
          id: op.id,
          name: op.name,
          kind: op.kind,
          instrument: { kind: op.instrument, params: clampParams(op.instrument, op.params ?? {}) },
          colour: swatchForIndex(doc.trackOrder.length),
        });
        if (op.volume !== undefined) t.mix.volume = clamp(op.volume, -60, 6);
        if (op.pan !== undefined) t.mix.pan = clamp(op.pan, -1, 1);
        return ops.addTrack(doc, t);
      }
      case "renameTrack":
        track(op.trackId);
        return ops.renameTrack(doc, op.trackId, op.name);
      case "removeTrack":
        track(op.trackId);
        return ops.removeTrack(doc, op.trackId);
      case "setInstrument": {
        const t = track(op.trackId);
        if ((t.kind === "drum") !== (op.instrument === "kit")) raise(`track ${t.id} is ${t.kind}; ${op.instrument} does not fit`);
        return ops.setInstrument(doc, op.trackId, { kind: op.instrument, params: clampParams(op.instrument, op.params ?? {}) });
      }
      case "setInstrumentParam": {
        const t = track(op.trackId);
        if (t.instrument.kind === "sampler") raise("sampler tracks are not editable here");
        const [value] = Object.values(clampParams(t.instrument.kind, { [op.key]: op.value }));
        return ops.setInstrumentParam(doc, op.trackId, op.key, value!);
      }
      case "setMix": {
        track(op.trackId);
        const mix: Parameters<typeof ops.setMix>[2] = {};
        if (op.volume !== undefined) mix.volume = clamp(op.volume, -60, 6);
        if (op.pan !== undefined) mix.pan = clamp(op.pan, -1, 1);
        if (op.mute !== undefined) mix.mute = op.mute;
        if (op.solo !== undefined) mix.solo = op.solo;
        ops.setMix(doc, op.trackId, mix);
        if (op.reverb !== undefined) ops.setSend(doc, op.trackId, "reverb", clamp(op.reverb, 0, 1));
        if (op.delay !== undefined) ops.setSend(doc, op.trackId, "delay", clamp(op.delay, 0, 1));
        return;
      }
      case "addPattern": {
        fresh(op.id, "pattern");
        const lengthTicks = op.bars * BAR();
        const p: Pattern = { id: op.id, name: op.name, kind: op.kind, lengthTicks, notes: toNotes(op.notes, lengthTicks, newId) };
        return ops.addPattern(doc, p);
      }
      case "replaceNotes": {
        const p = pattern(op.patternId);
        p.notes = toNotes(op.notes, p.lengthTicks, newId);
        return;
      }
      case "rampVelocity": {
        const p = pattern(op.patternId);
        const from = clamp(op.from, 0, 1);
        const to = clamp(op.to, 0, 1);
        const span = Math.max(1, p.lengthTicks - STEP_TICKS);
        for (const n of p.notes) n.velocity = from + ((to - from) * n.start) / span;
        return;
      }
      case "addClip": {
        fresh(op.id, "clip");
        const t = track(op.trackId);
        const p = pattern(op.patternId);
        if (t.kind !== p.kind) raise(`pattern ${p.id} is ${p.kind} but track ${t.id} is ${t.kind}`);
        return ops.addClip(doc, { id: op.id, trackId: t.id, patternId: p.id, startTick: op.bar * BAR(), lengthTicks: op.bars * BAR(), offsetTicks: 0 });
      }
      case "resizeClip":
        clip(op.clipId);
        return ops.resizeClip(doc, op.clipId, op.bars * BAR());
      case "removeClip":
        clip(op.clipId);
        return ops.removeClip(doc, op.clipId);
      case "makeUnique":
        clip(op.clipId);
        fresh(op.newPatternId, "pattern");
        return ops.makeUnique(doc, op.clipId, op.newPatternId, newId);
      case "addSection":
        fresh(op.id, "section");
        return ops.addSection(doc, { id: op.id, name: op.name, startTick: op.bar * BAR(), endTick: (op.bar + op.bars) * BAR(), colour: swatchForIndex(doc.sections.length) });
      case "renameSection": {
        if (!doc.sections.some((s) => s.id === op.sectionId)) raise(`no section "${op.sectionId}"`);
        return ops.updateSection(doc, op.sectionId, { name: op.name });
      }
      case "addEffect": {
        const t = track(op.trackId);
        fresh(op.id, "effect");
        if (t.effects.length >= AI_LIMITS.effectsPerTrack) raise(`track ${t.id} already has ${AI_LIMITS.effectsPerTrack} effects, the limit`);
        return ops.addEffect(doc, t.id, { id: op.id, kind: op.kind, enabled: op.enabled ?? true, params: clampEffectParams(op.kind, op.params ?? {}) });
      }
      case "removeEffect": {
        const t = track(op.trackId);
        effect(t, op.effectId);
        return ops.removeEffect(doc, t.id, op.effectId);
      }
      case "setEffectParam": {
        const t = track(op.trackId);
        const e = effect(t, op.effectId);
        const [value] = Object.values(clampEffectParams(e.kind, { [op.key]: op.value }));
        return ops.setEffectParam(doc, t.id, e.id, op.key, value!);
      }
      case "setEffectEnabled": {
        const t = track(op.trackId);
        effect(t, op.effectId);
        return ops.setEffectEnabled(doc, t.id, op.effectId, op.enabled);
      }
      case "setTimeSig":
        return ops.setTimeSig(doc, [op.beats, op.unit]);
      case "setAutomation": {
        track(op.trackId);
        const range = AUTOMATION_RANGES[op.param];
        const points = op.points.map((p) => ({ tick: p.bar * BAR() + (p.step ?? 0) * STEP_TICKS, value: clamp(p.value, range.min, range.max) }));
        return ops.setAutomationLane(doc, op.trackId, op.param, points);
      }
      case "quantiseNotes":
        pattern(op.patternId);
        return ops.quantiseNotes(doc, op.patternId, null, GRID_TICKS[op.grid ?? "1/16"], op.strength ?? 1);
    }
  }
}

function raise(reason: string): never {
  throw new Reject(reason);
}
