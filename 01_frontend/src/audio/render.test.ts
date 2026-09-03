import { demoSong, emptySong } from "@hpi/shared";
import { describe, expect, it } from "vitest";

import { songDurationSeconds, TAIL_SECONDS } from "./render.ts";

describe("render duration", () => {
  it("is the song length at its tempo plus a tail", () => {
    const song = demoSong(); // 40 bars of 4/4 at 104 BPM = 160 beats
    expect(songDurationSeconds(song)).toBeCloseTo((160 * 60) / 104 + TAIL_SECONDS, 5);
  });

  it("an empty song still renders the tail", () => {
    expect(songDurationSeconds(emptySong("x"))).toBe(TAIL_SECONDS);
  });
});
