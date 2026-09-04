import { describe, expect, it } from "vitest";

import { demoSong } from "./demoSong.ts";
import type { SongDoc } from "./song.ts";
import { SUMMARY_BUDGET, drumLanes, summariseSong } from "./songSummary.ts";

/** Same document, different key order: the summary must not care. */
function shuffled(doc: SongDoc): SongDoc {
  const reverse = <T>(r: Record<string, T>) => Object.fromEntries(Object.entries(r).reverse());
  return { ...doc, tracks: reverse(doc.tracks), patterns: reverse(doc.patterns), clips: reverse(doc.clips) };
}

describe("summariseSong", () => {
  const doc = demoSong();
  const text = summariseSong(doc);

  it("is deterministic and independent of object key order", () => {
    expect(summariseSong(demoSong())).toBe(text);
    expect(summariseSong(shuffled(doc))).toBe(text);
  });

  it("names every id the model may reference", () => {
    const ids = [...Object.keys(doc.tracks), ...Object.keys(doc.patterns), ...Object.keys(doc.clips), ...doc.sections.map((s) => s.id)];
    for (const id of ids) expect(text, id).toContain(id);
  });

  it("stays inside the budget for the demo", () => {
    expect(text.length).toBeLessThan(SUMMARY_BUDGET);
    expect(text.length).toBeGreaterThan(2000);
  });

  it("writes the verse beat's first bar as lanes", () => {
    const lanes = drumLanes(doc.patterns["drums-verse"]!, 16);
    expect(lanes.find((l) => l.startsWith("kick"))).toBe("kick      x...x...x...x...");
    expect(lanes.at(-1)).toMatch(/^bars 2-4 (repeat|differ)/);
    expect(text).toContain("kick      x...x...x...x...");
  });

  it("lists full notes only for focused patterns", () => {
    expect(text).not.toContain("notes: ");
    const focused = summariseSong(doc, ["bass-hook"]);
    expect(focused).toMatch(/bass-hook "Hook bass"[^\n]*\n\s+notes: \d+@\d+:\d+/);
  });
});
