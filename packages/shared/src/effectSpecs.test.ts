import { describe, expect, it } from "vitest";

import { EFFECT_KINDS, EFFECT_SPECS, defaultEffect, effectParamValue, isChoiceSpec, resolvedEffectParams } from "./effectSpecs.ts";
import { EffectKindSchema } from "./song.ts";

describe("effect specs", () => {
  it("covers every schema kind with at least one parameter", () => {
    expect(EFFECT_KINDS.sort()).toEqual([...EffectKindSchema.options].sort());
    for (const kind of EFFECT_KINDS) expect(EFFECT_SPECS[kind].length).toBeGreaterThan(0);
  });

  it("resolves stored values over defaults and validates choices", () => {
    const filter = defaultEffect("filter", "f1");
    expect(resolvedEffectParams(filter)).toEqual({ frequency: 1000, Q: 1, type: "lowpass" });
    filter.params["frequency"] = 440;
    filter.params["type"] = "highpass";
    expect(effectParamValue(filter, "frequency")).toBe(440);
    expect(effectParamValue(filter, "type")).toBe("highpass");
    filter.params["type"] = "notch";
    expect(effectParamValue(filter, "type")).toBe("lowpass");
  });

  it("rejects unknown keys", () => {
    expect(() => effectParamValue(defaultEffect("reverb", "r"), "cutoff")).toThrow(/unknown param/);
  });

  it("only the filter type is a choice", () => {
    const choices = EFFECT_KINDS.flatMap((kind) => EFFECT_SPECS[kind].filter(isChoiceSpec).map((s) => `${kind}.${s.key}`));
    expect(choices).toEqual(["filter.type"]);
  });
});
