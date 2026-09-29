import { describe, expect, it } from "vitest";

import { demoSong } from "./demoSong.ts";
import { migrateSong } from "./migrate.ts";

/** A v1 document, as every song saved before the insert chain and automation existed. */
function v1Song(): Record<string, unknown> {
  const doc = JSON.parse(JSON.stringify(demoSong())) as Record<string, unknown> & { tracks: Record<string, Record<string, unknown>> };
  doc["schemaVersion"] = 1;
  for (const track of Object.values(doc.tracks)) {
    delete track["effects"];
    delete track["automation"];
  }
  return doc;
}

describe("migrateSong", () => {
  it("steps a v1 document to v2 with an empty chain and no lanes on every track", () => {
    const doc = migrateSong(v1Song());
    expect(doc.schemaVersion).toBe(2);
    for (const track of Object.values(doc.tracks)) {
      expect(track.effects).toEqual([]);
      expect(track.automation).toEqual({});
    }
  });

  it("passes a current document through unchanged", () => {
    const original = demoSong();
    expect(migrateSong(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });

  it("refuses a version it does not know", () => {
    expect(() => migrateSong({ ...demoSong(), schemaVersion: 3 })).toThrow();
  });
});
