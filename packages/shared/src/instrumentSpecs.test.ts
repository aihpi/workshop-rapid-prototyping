import { INSTRUMENT_SPECS, paramValue, resolvedParams } from "./instrumentSpecs.ts";
import { describe, expect, it } from "vitest";

describe("instrument specs", () => {
  it("every default sits inside its own range", () => {
    for (const [kind, specs] of Object.entries(INSTRUMENT_SPECS)) {
      for (const spec of specs) {
        expect(spec.default, `${kind}.${spec.key}`).toBeGreaterThanOrEqual(spec.min);
        expect(spec.default, `${kind}.${spec.key}`).toBeLessThanOrEqual(spec.max);
      }
    }
  });

  it("a stored number wins, anything else falls back to the default", () => {
    expect(paramValue({ kind: "pluck", params: { dampening: 1234 } }, "dampening")).toBe(1234);
    expect(paramValue({ kind: "pluck", params: {} }, "dampening")).toBe(3000);
    expect(paramValue({ kind: "pluck", params: { dampening: "loud" } }, "dampening")).toBe(3000);
  });

  it("refuses a param the instrument does not have", () => {
    expect(() => paramValue({ kind: "kit", params: {} }, "cutoff")).toThrow(/unknown param cutoff/);
  });

  it("resolves the full set for a synth", () => {
    expect(resolvedParams({ kind: "fm", params: { attack: 0.2 } })).toEqual({
      harmonicity: 3,
      modulationIndex: 10,
      attack: 0.2,
      release: 0.5,
    });
  });
});
