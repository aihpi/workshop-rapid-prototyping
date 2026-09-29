import { describe, expect, it } from "vitest";

import { snapTicksFor } from "./snap.ts";

describe("snapTicksFor", () => {
  it("follows the time signature for bar and beat, stays absolute for note values", () => {
    expect(snapTicksFor("bar", [4, 4])).toBe(768);
    expect(snapTicksFor("bar", [3, 4])).toBe(576);
    expect(snapTicksFor("beat", [3, 4])).toBe(192);
    expect(snapTicksFor("beat", [6, 8])).toBe(96);
    expect(snapTicksFor("eighth", [6, 8])).toBe(96);
    expect(snapTicksFor("sixteenth", [7, 8])).toBe(48);
    expect(snapTicksFor("off", [4, 4])).toBe(0);
  });
});
