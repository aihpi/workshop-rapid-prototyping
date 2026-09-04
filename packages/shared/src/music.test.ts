import { describe, expect, it } from "vitest";

import { barsToTicks, inScale, midiToNoteName, PPQ, snapTicks, STEP_TICKS, ticksPerBar, ticksToBars } from "./music.ts";

describe("musical time", () => {
  it("a 4/4 bar is four quarter notes", () => {
    expect(ticksPerBar([4, 4])).toBe(PPQ * 4);
  });

  it("a 6/8 bar is six eighth notes", () => {
    expect(ticksPerBar([6, 8])).toBe(PPQ * 3);
  });

  it("bars and ticks round-trip", () => {
    expect(ticksToBars(barsToTicks(2.5, [4, 4]), [4, 4])).toBe(2.5);
  });

  it("a step is a sixteenth", () => {
    expect(STEP_TICKS * 16).toBe(ticksPerBar([4, 4]));
  });

  it("snaps to the nearest grid line", () => {
    expect(snapTicks(100, 48)).toBe(96);
    expect(snapTicks(130, 48)).toBe(144);
    expect(snapTicks(0, 48)).toBe(0);
  });
});

describe("pitch helpers", () => {
  it("names middle C and the note below it", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(59)).toBe("B3");
  });

  it("knows F minor", () => {
    const f = 53;
    expect(inScale(53, f, "minor")).toBe(true); // F
    expect(inScale(56, f, "minor")).toBe(true); // Ab
    expect(inScale(57, f, "minor")).toBe(false); // A
  });
});
