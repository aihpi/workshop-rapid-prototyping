import { describe, expect, it } from "vitest";

import { envelope, normalise, peak, reverse, silenceBounds, trim } from "./dsp.ts";
import { encodeWav } from "./wav.ts";

const ramp = (n: number, scale = 1) => Float32Array.from({ length: n }, (_, i) => (i / (n - 1)) * scale);

describe("dsp", () => {
  it("trims by seconds and clamps to the buffer", () => {
    const c = [ramp(1000)];
    expect(trim(c, 1000, 0.25, 0.5)[0]!.length).toBe(250);
    expect(trim(c, 1000, -1, 5)[0]!.length).toBe(1000);
    expect(trim(c, 1000, 0.9, 0.1)[0]!.length).toBe(0);
  });

  it("normalises to just under full scale and leaves silence alone", () => {
    const quiet = [ramp(100, 0.25)];
    expect(peak(normalise(quiet))).toBeCloseTo(0.98, 5);
    const silent = [new Float32Array(100)];
    expect(peak(normalise(silent))).toBe(0);
  });

  it("reverses without touching the original", () => {
    const c = [Float32Array.from([0, 0.5, 1])];
    expect(Array.from(reverse(c)[0]!)).toEqual([1, 0.5, 0]);
    expect(Array.from(c[0]!)).toEqual([0, 0.5, 1]);
  });

  it("draws an envelope of the requested width", () => {
    const env = envelope(ramp(1000), 10);
    expect(env.length).toBe(10);
    expect(env[9]).toBeCloseTo(1, 3);
    expect(env[0]!).toBeLessThan(env[9]!);
  });

  it("finds the sound inside the silence", () => {
    const c = new Float32Array(1000);
    for (let i = 300; i < 600; i++) c[i] = 0.5;
    expect(silenceBounds([c], 1000)).toEqual([0.3, 0.6]);
    expect(silenceBounds([new Float32Array(100)], 100)).toEqual([0, 1]);
  });
});

describe("wav", () => {
  it("writes a valid header and 16-bit little-endian samples", () => {
    const left = Float32Array.from([0, 0.5, -0.5, 1, -1]);
    const right = Float32Array.from([0, 0, 0, 0, 0]);
    const buf = encodeWav([left, right], 44100);
    const view = new DataView(buf);
    const tag = (o: number) => String.fromCharCode(view.getUint8(o), view.getUint8(o + 1), view.getUint8(o + 2), view.getUint8(o + 3));
    expect(buf.byteLength).toBe(44 + 5 * 2 * 2);
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(tag(12)).toBe("fmt ");
    expect(tag(36)).toBe("data");
    expect(view.getUint32(4, true)).toBe(36 + 20);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(28, true)).toBe(44100 * 4);
    expect(view.getUint32(40, true)).toBe(20);
    expect(view.getInt16(44 + 1 * 4, true)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(view.getInt16(44 + 3 * 4, true)).toBe(0x7fff);
    expect(view.getInt16(44 + 4 * 4, true)).toBe(-0x8000);
  });
});
