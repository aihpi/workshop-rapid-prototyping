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
    const effectIds = Object.values(doc.tracks).flatMap((t) => t.effects.map((e) => e.id));
    expect(effectIds.length).toBeGreaterThan(0);
    const ids = [...Object.keys(doc.tracks), ...Object.keys(doc.patterns), ...Object.keys(doc.clips), ...doc.sections.map((s) => s.id), ...effectIds];
    for (const id of ids) expect(text, id).toContain(id);
  });

  it("lists each track's effects with non-default params and its automation lanes", () => {
    expect(text).toMatch(/^ {2}drums "Drums"[^\n]* fx=\[compressor:drums-comp\{threshold=-18\}\]/m);
    expect(text).toMatch(/^ {2}keys "Keys"[^\n]* auto=volume\(2pts\)\[0:0=-30,2:0=-8\]$/m);
    expect(text).not.toMatch(/^ {2}bass "Bass"[^\n]*(fx=|auto=)/m);

    const bypassed = demoSong();
    bypassed.tracks["drums"]!.effects[0]!.enabled = false;
    bypassed.tracks["drums"]!.effects.push({ id: "drums-verb", kind: "reverb", enabled: true, params: {} });
    expect(summariseSong(bypassed)).toContain("fx=[compressor:drums-comp(off){threshold=-18},reverb:drums-verb{}]");
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
