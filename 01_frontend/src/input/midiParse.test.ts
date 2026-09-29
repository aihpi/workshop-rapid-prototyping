import { describe, expect, it } from "vitest";

import { parseMidi } from "./midiParse.ts";

describe("parseMidi", () => {
  it("reads note on with velocity scaled to 0..1, on any channel", () => {
    expect(parseMidi(new Uint8Array([0x90, 60, 127]))).toEqual({ type: "on", pitch: 60, velocity: 1 });
    expect(parseMidi(new Uint8Array([0x93, 61, 64]))?.velocity).toBeCloseTo(64 / 127);
  });

  it("treats note off and zero-velocity note on the same", () => {
    expect(parseMidi(new Uint8Array([0x80, 60, 0]))).toEqual({ type: "off", pitch: 60, velocity: 0 });
    expect(parseMidi(new Uint8Array([0x90, 60, 0]))).toEqual({ type: "off", pitch: 60, velocity: 0 });
  });

  it("ignores everything else", () => {
    expect(parseMidi(new Uint8Array([0xb0, 1, 100]))).toBeNull();
    expect(parseMidi(new Uint8Array([]))).toBeNull();
  });
});
