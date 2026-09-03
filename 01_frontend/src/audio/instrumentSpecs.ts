import type { Instrument, InstrumentKind } from "@hpi/shared";

/**
 * What each instrument exposes to the sound-design panel, and the defaults the
 * synth is built with. Pure data: the panel renders from it, the instrument
 * layer applies it, and `paramValue` fills gaps in a document's loose params.
 */
export type ParamSpec = {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step?: number;
  unit?: string;
};

export const INSTRUMENT_LABELS: Record<InstrumentKind, string> = {
  kit: "Drum kit",
  pluck: "Pluck",
  fm: "Brass",
  poly: "Keys",
  sampler: "Sampler",
};

export const INSTRUMENT_SPECS: Record<InstrumentKind, readonly ParamSpec[]> = {
  kit: [
    { key: "tune", label: "Tune", min: -12, max: 12, default: 0, step: 1, unit: "st" },
    { key: "decay", label: "Decay", min: 0.3, max: 3, default: 1, step: 0.05, unit: "x" },
  ],
  pluck: [
    { key: "dampening", label: "Dampening", min: 200, max: 8000, default: 3000, unit: "Hz" },
    { key: "resonance", label: "Resonance", min: 0.5, max: 0.99, default: 0.9, step: 0.01 },
    { key: "attackNoise", label: "Attack noise", min: 0.1, max: 5, default: 1, step: 0.1 },
  ],
  fm: [
    { key: "harmonicity", label: "Harmonicity", min: 0.5, max: 8, default: 3, step: 0.5 },
    { key: "modulationIndex", label: "Mod index", min: 0, max: 30, default: 10, step: 0.5 },
    { key: "attack", label: "Attack", min: 0.001, max: 1, default: 0.05, step: 0.005, unit: "s" },
    { key: "release", label: "Release", min: 0.01, max: 4, default: 0.5, step: 0.01, unit: "s" },
  ],
  poly: [
    { key: "cutoff", label: "Cutoff", min: 100, max: 12000, default: 2500, unit: "Hz" },
    { key: "spread", label: "Spread", min: 0, max: 60, default: 20, step: 1, unit: "ct" },
    { key: "attack", label: "Attack", min: 0.001, max: 2, default: 0.02, step: 0.005, unit: "s" },
    { key: "release", label: "Release", min: 0.01, max: 6, default: 0.8, step: 0.01, unit: "s" },
  ],
  sampler: [
    { key: "attack", label: "Attack", min: 0, max: 1, default: 0, step: 0.005, unit: "s" },
    { key: "release", label: "Release", min: 0.01, max: 4, default: 0.3, step: 0.01, unit: "s" },
  ],
};

export function paramValue(instrument: Instrument, key: string): number {
  const stored = instrument.params[key];
  if (typeof stored === "number") return stored;
  const spec = INSTRUMENT_SPECS[instrument.kind].find((s) => s.key === key);
  if (!spec) throw new Error(`unknown param ${key} for ${instrument.kind}`);
  return spec.default;
}

/** Every param of the instrument, stored value or default, ready to hand to a synth. */
export function resolvedParams(instrument: Instrument): Record<string, number> {
  const out: Record<string, number> = {};
  for (const spec of INSTRUMENT_SPECS[instrument.kind]) out[spec.key] = paramValue(instrument, spec.key);
  return out;
}
