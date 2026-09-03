import { z } from "zod";

import { HpiSwatchSchema } from "./colour.ts";

const id = z.string().min(1);
const tick = z.number().int().min(0);
const positiveTicks = z.number().int().min(1);

export const NoteSchema = z.object({
  id,
  /** Ticks from the start of the pattern. */
  start: tick,
  duration: positiveTicks,
  /** MIDI pitch. Drum patterns use General MIDI drum numbers here. */
  pitch: z.number().int().min(0).max(127),
  velocity: z.number().min(0).max(1),
});

export const TrackKindSchema = z.enum(["drum", "pitched"]);

export const PatternSchema = z.object({
  id,
  name: z.string(),
  kind: TrackKindSchema,
  lengthTicks: positiveTicks,
  notes: z.array(NoteSchema),
});

export const InstrumentKindSchema = z.enum(["kit", "pluck", "fm", "poly", "sampler"]);

export const InstrumentSchema = z.object({
  kind: InstrumentKindSchema,
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  /** Only meaningful for `sampler`. */
  sampleId: id.optional(),
});

export const MixSchema = z.object({
  /** Decibels. */
  volume: z.number().min(-60).max(6),
  pan: z.number().min(-1).max(1),
  mute: z.boolean(),
  solo: z.boolean(),
  sends: z.object({
    reverb: z.number().min(0).max(1),
    delay: z.number().min(0).max(1),
  }),
});

export const TrackSchema = z.object({
  id,
  name: z.string(),
  kind: TrackKindSchema,
  colour: HpiSwatchSchema,
  instrument: InstrumentSchema,
  mix: MixSchema,
});

/**
 * A placement of a pattern on the timeline. Several clips may point at the same
 * pattern; that is what makes editing one hook edit all of them.
 */
export const ClipSchema = z.object({
  id,
  trackId: id,
  patternId: id,
  startTick: tick,
  lengthTicks: positiveTicks,
  /** Where inside the pattern playback begins. */
  offsetTicks: tick,
});

export const SectionSchema = z.object({
  id,
  name: z.string(),
  startTick: tick,
  endTick: positiveTicks,
  colour: HpiSwatchSchema,
});

export const SampleRefSchema = z.object({
  id,
  name: z.string(),
  /** Path the browser can fetch, served by nginx from the samples volume. */
  url: z.string(),
  durationSec: z.number().min(0),
  trimStartSec: z.number().min(0),
  trimEndSec: z.number().min(0),
  normalised: z.boolean(),
  reversed: z.boolean(),
});

export const SongMetaSchema = z.object({
  title: z.string(),
  bpm: z.number().min(20).max(300),
  timeSig: z.tuple([z.number().int().min(1).max(16), z.union([z.literal(4), z.literal(8)])]),
});

export const SongDocSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  /** Bumped by the server on every save, for optimistic locking. */
  rev: z.number().int().min(0),
  meta: SongMetaSchema,
  tracks: z.record(id, TrackSchema),
  trackOrder: z.array(id),
  patterns: z.record(id, PatternSchema),
  clips: z.record(id, ClipSchema),
  sections: z.array(SectionSchema),
  samples: z.record(id, SampleRefSchema),
});

export type Note = z.infer<typeof NoteSchema>;
export type TrackKind = z.infer<typeof TrackKindSchema>;
export type Pattern = z.infer<typeof PatternSchema>;
export type InstrumentKind = z.infer<typeof InstrumentKindSchema>;
export type Instrument = z.infer<typeof InstrumentSchema>;
export type Mix = z.infer<typeof MixSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type SampleRef = z.infer<typeof SampleRefSchema>;
export type SongMeta = z.infer<typeof SongMetaSchema>;
export type SongDoc = z.infer<typeof SongDocSchema>;

/**
 * Referential checks zod cannot express: every clip points at a track and a
 * pattern that exist, every ordered track exists, and no track is left out of
 * the order. Returns human-readable problems, empty when the document is sound.
 */
export function integrityIssues(doc: SongDoc): string[] {
  const issues: string[] = [];
  for (const clip of Object.values(doc.clips)) {
    if (!doc.tracks[clip.trackId]) issues.push(`clip ${clip.id} references missing track ${clip.trackId}`);
    if (!doc.patterns[clip.patternId]) issues.push(`clip ${clip.id} references missing pattern ${clip.patternId}`);
  }
  for (const trackId of doc.trackOrder) {
    if (!doc.tracks[trackId]) issues.push(`trackOrder references missing track ${trackId}`);
  }
  for (const trackId of Object.keys(doc.tracks)) {
    if (!doc.trackOrder.includes(trackId)) issues.push(`track ${trackId} is missing from trackOrder`);
  }
  for (const track of Object.values(doc.tracks)) {
    if (track.instrument.sampleId && !doc.samples[track.instrument.sampleId]) {
      issues.push(`track ${track.id} references missing sample ${track.instrument.sampleId}`);
    }
  }
  return issues;
}
