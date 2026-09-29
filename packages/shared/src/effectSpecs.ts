import type { ParamSpec } from "./instrumentSpecs.ts";
import type { Effect, EffectKind } from "./song.ts";

/**
 * What each insert effect exposes, mirroring `instrumentSpecs.ts`. The device
 * chain renders from it, the audio layer applies it, and `effectParamValue`
 * fills gaps in a document's loose params. Only the filter has a non-numeric
 * parameter, its type, so a choice spec exists for that one case.
 */
export type ChoiceSpec = {
  key: string;
  label: string;
  choices: readonly string[];
  default: string;
};

export type EffectParamSpec = ParamSpec | ChoiceSpec;

export const isChoiceSpec = (spec: EffectParamSpec): spec is ChoiceSpec => "choices" in spec;

export const EFFECT_LABELS: Record<EffectKind, string> = {
  eq3: "EQ",
  compressor: "Compressor",
  distortion: "Distortion",
  chorus: "Chorus",
  filter: "Filter",
  delay: "Delay",
  reverb: "Reverb",
};

export const EFFECT_KINDS = Object.keys(EFFECT_LABELS) as EffectKind[];

export const EFFECT_SPECS: Record<EffectKind, readonly EffectParamSpec[]> = {
  eq3: [
    { key: "low", label: "Low", min: -24, max: 24, default: 0, step: 0.5, unit: "dB" },
    { key: "mid", label: "Mid", min: -24, max: 24, default: 0, step: 0.5, unit: "dB" },
    { key: "high", label: "High", min: -24, max: 24, default: 0, step: 0.5, unit: "dB" },
    { key: "lowFrequency", label: "Low split", min: 40, max: 1000, default: 400, unit: "Hz" },
    { key: "highFrequency", label: "High split", min: 1000, max: 12000, default: 2500, unit: "Hz" },
  ],
  compressor: [
    { key: "threshold", label: "Threshold", min: -60, max: 0, default: -24, step: 0.5, unit: "dB" },
    { key: "ratio", label: "Ratio", min: 1, max: 20, default: 4, step: 0.5 },
    { key: "attack", label: "Attack", min: 0.001, max: 1, default: 0.003, step: 0.001, unit: "s" },
    { key: "release", label: "Release", min: 0.01, max: 1, default: 0.25, step: 0.01, unit: "s" },
    { key: "knee", label: "Knee", min: 0, max: 40, default: 30, step: 1, unit: "dB" },
  ],
  distortion: [
    { key: "distortion", label: "Drive", min: 0, max: 1, default: 0.4, step: 0.01 },
    { key: "wet", label: "Wet", min: 0, max: 1, default: 1, step: 0.01 },
  ],
  chorus: [
    { key: "frequency", label: "Rate", min: 0.1, max: 10, default: 1.5, step: 0.1, unit: "Hz" },
    { key: "delayTime", label: "Delay", min: 1, max: 20, default: 3.5, step: 0.5, unit: "ms" },
    { key: "depth", label: "Depth", min: 0, max: 1, default: 0.7, step: 0.01 },
    { key: "wet", label: "Wet", min: 0, max: 1, default: 0.5, step: 0.01 },
  ],
  filter: [
    { key: "frequency", label: "Frequency", min: 20, max: 20000, default: 1000, unit: "Hz" },
    { key: "Q", label: "Resonance", min: 0.1, max: 20, default: 1, step: 0.1 },
    { key: "type", label: "Type", choices: ["lowpass", "highpass", "bandpass"], default: "lowpass" },
  ],
  delay: [
    { key: "delayTime", label: "Time", min: 0.01, max: 1, default: 0.25, step: 0.01, unit: "s" },
    { key: "feedback", label: "Feedback", min: 0, max: 0.9, default: 0.3, step: 0.01 },
    { key: "wet", label: "Wet", min: 0, max: 1, default: 0.3, step: 0.01 },
  ],
  reverb: [
    { key: "decay", label: "Decay", min: 0.1, max: 10, default: 2, step: 0.1, unit: "s" },
    { key: "preDelay", label: "Pre-delay", min: 0, max: 0.2, default: 0.01, step: 0.005, unit: "s" },
    { key: "wet", label: "Wet", min: 0, max: 1, default: 0.3, step: 0.01 },
  ],
};

export function effectParamValue(effect: Effect, key: string): number | string {
  const spec = EFFECT_SPECS[effect.kind].find((s) => s.key === key);
  if (!spec) throw new Error(`unknown param ${key} for ${effect.kind}`);
  const stored = effect.params[key];
  if (isChoiceSpec(spec)) return typeof stored === "string" && spec.choices.includes(stored) ? stored : spec.default;
  return typeof stored === "number" ? stored : spec.default;
}

/** Every param of the effect, stored value or default, ready to hand to a Tone node. */
export function resolvedEffectParams(effect: Effect): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const spec of EFFECT_SPECS[effect.kind]) out[spec.key] = effectParamValue(effect, spec.key);
  return out;
}

export const defaultEffect = (kind: EffectKind, id: string): Effect => ({ id, kind, enabled: true, params: {} });
