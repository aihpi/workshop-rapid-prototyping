import { describe, expect, it } from "vitest";

import { emptySong, makeTrack } from "./factory.ts";
import { migrateSong } from "./migrate.ts";
import { integrityIssues, SongDocSchema } from "./song.ts";

describe("song schema", () => {
  it("an empty song is valid and round-trips through JSON", () => {
    const song = emptySong("s1", "Test");
    const parsed = SongDocSchema.parse(JSON.parse(JSON.stringify(song)));
    expect(parsed).toEqual(song);
  });

  it("rejects off-brand colours by construction", () => {
    const song = emptySong("s1");
    const track = makeTrack({ id: "t1", name: "Drums", kind: "drum" });
    song.tracks["t1"] = { ...track, colour: { hue: "blue", shade: 100 } as never };
    song.trackOrder.push("t1");
    expect(() => SongDocSchema.parse(song)).toThrow();
  });

  it("rejects a bpm outside the playable range", () => {
    const song = emptySong("s1");
    song.meta.bpm = 900;
    expect(() => SongDocSchema.parse(song)).toThrow();
  });

  it("reports dangling references that zod cannot see", () => {
    const song = emptySong("s1");
    song.clips["c1"] = { id: "c1", trackId: "ghost", patternId: "nope", startTick: 0, lengthTicks: 768, offsetTicks: 0 };
    song.trackOrder.push("missing");
    const issues = integrityIssues(song);
    expect(issues).toHaveLength(3);
    expect(issues.join("\n")).toMatch(/missing track ghost/);
    expect(issues.join("\n")).toMatch(/missing pattern nope/);
    expect(issues.join("\n")).toMatch(/trackOrder references missing track missing/);
  });
});

describe("migration", () => {
  it("passes a current document through untouched", () => {
    const song = emptySong("s1");
    expect(migrateSong(song)).toEqual(song);
  });

  it("refuses a version it has no path from", () => {
    expect(() => migrateSong({ schemaVersion: 0 })).toThrow(/no migration from schema version 0/);
  });

  it("refuses non-objects", () => {
    expect(() => migrateSong("nope")).toThrow(/not an object/);
  });
});
