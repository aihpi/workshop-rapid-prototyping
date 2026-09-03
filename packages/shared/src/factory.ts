import { swatchForIndex } from "./colour.ts";
import type { HpiSwatch } from "./colour.ts";
import type { Instrument, InstrumentKind, Mix, SongDoc, Track, TrackKind } from "./song.ts";

export const SCHEMA_VERSION = 1 as const;

export const defaultMix = (): Mix => ({
  volume: 0,
  pan: 0,
  mute: false,
  solo: false,
  sends: { reverb: 0, delay: 0 },
});

export const defaultInstrument = (kind: InstrumentKind): Instrument => ({ kind, params: {} });

export function emptySong(id: string, title = "Untitled"): SongDoc {
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    rev: 0,
    meta: { title, bpm: 120, timeSig: [4, 4] },
    tracks: {},
    trackOrder: [],
    patterns: {},
    clips: {},
    sections: [],
    samples: {},
  };
}

export function makeTrack(input: {
  id: string;
  name: string;
  kind: TrackKind;
  instrument?: Instrument;
  colour?: HpiSwatch;
  index?: number;
}): Track {
  return {
    id: input.id,
    name: input.name,
    kind: input.kind,
    colour: input.colour ?? swatchForIndex(input.index ?? 0),
    instrument: input.instrument ?? defaultInstrument(input.kind === "drum" ? "kit" : "poly"),
    mix: defaultMix(),
  };
}
