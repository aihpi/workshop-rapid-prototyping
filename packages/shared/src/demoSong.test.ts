import { describe, expect, it } from "vitest";

import { demoSong } from "./demoSong.ts";
import { ticksPerBar } from "./music.ts";
import { placementCount, songEndTick } from "./ops.ts";
import { integrityIssues, SongDocSchema } from "./song.ts";

describe("demo song", () => {
  const song = demoSong();
  const BAR = ticksPerBar([4, 4]);

  it("is a valid document with no dangling references", () => {
    expect(() => SongDocSchema.parse(song)).not.toThrow();
    expect(integrityIssues(song)).toEqual([]);
  });

  it("is forty bars with seven sections in order", () => {
    expect(songEndTick(song)).toBe(40 * BAR);
    expect(song.sections.map((s) => s.name)).toEqual(["Intro", "Verse", "Bridge", "Hook", "Verse", "Hook", "Outro"]);
  });

  it("uses linked clips: both verses and both hooks share patterns", () => {
    expect(placementCount(song, "drums-verse")).toBe(2);
    expect(placementCount(song, "drums-hook")).toBe(2);
    expect(placementCount(song, "brass-hook")).toBe(2);
    expect(placementCount(song, "pad-verse")).toBe(4);
    expect(placementCount(song, "lead-hook")).toBe(1);
  });

  it("keeps every note inside its pattern", () => {
    for (const p of Object.values(song.patterns)) {
      for (const note of p.notes) expect(note.start, `${p.id}`).toBeLessThan(p.lengthTicks);
    }
  });

  it("stays on brand: at most one shade per hue is not required, but every colour is a primary", () => {
    for (const t of Object.values(song.tracks)) expect(["red", "orange", "yellow", "grey"]).toContain(t.colour.hue);
  });

  it("ships one insert effect and one automation lane so both are visible on first load", () => {
    expect(song.tracks["drums"]!.effects.map((e) => e.kind)).toEqual(["compressor"]);
    expect(song.tracks["keys"]!.automation["volume"]!.points).toHaveLength(2);
    const others = Object.values(song.tracks).filter((t) => t.id !== "drums" && t.id !== "keys");
    for (const t of others) {
      expect(t.effects).toEqual([]);
      expect(t.automation).toEqual({});
    }
  });

  it("is deterministic", () => {
    expect(demoSong()).toEqual(song);
  });
});
