import { emptySong, makeTrack, ops, ticksPerBar } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { useSongStore } from "./songStore.ts";
import { selectEditingPattern, useUiStore } from "./uiStore.ts";
import { wireStores } from "./index.ts";

const BAR = ticksPerBar([4, 4]);

function fixture(): SongDoc {
  const song = emptySong("s1", "Fixture");
  ops.addTrack(song, makeTrack({ id: "drums", name: "Drums", kind: "drum" }));
  ops.addPattern(song, { id: "p1", name: "Hook", kind: "drum", lengthTicks: BAR, notes: [] });
  ops.addClip(song, { id: "c1", trackId: "drums", patternId: "p1", startTick: 0, lengthTicks: BAR, offsetTicks: 0 });
  ops.addClip(song, { id: "c2", trackId: "drums", patternId: "p1", startTick: 4 * BAR, lengthTicks: BAR, offsetTicks: 0 });
  return song;
}

const song = () => useSongStore.getState();
const ui = () => useUiStore.getState();

beforeEach(() => {
  song().load(fixture());
  ui().clearSelection();
  ui().setEditingClip(null);
});

describe("song store", () => {
  it("apply changes the document and can be undone to a deep-equal original", () => {
    const original = song().doc;
    song().apply("Move clip", (d) => ops.moveClip(d, "c1", 2 * BAR));
    expect(song().doc.clips["c1"]!.startTick).toBe(2 * BAR);
    expect(song().canUndo).toBe(true);
    expect(song().undoLabel).toBe("Move clip");

    song().undo();
    expect(song().doc).not.toBe(original);
    expect(song().doc).toEqual(original);
    expect(song().canRedo).toBe(true);
  });

  it("a no-op apply keeps the same document reference", () => {
    // The audio reconciler relies on this: unchanged means identical reference.
    const before = song().doc;
    song().apply("Nothing", () => {});
    expect(song().doc).toBe(before);
    expect(song().canUndo).toBe(false);
  });

  it("an edit touching one pattern leaves tracks and clips reference-identical", () => {
    const before = song().doc;
    song().apply("Toggle step", (d) => ops.toggleStep(d, "p1", 36, 0, 48, "n1"));
    const after = song().doc;
    expect(after.patterns).not.toBe(before.patterns);
    expect(after.tracks).toBe(before.tracks);
    expect(after.clips).toBe(before.clips);
    expect(after.meta).toBe(before.meta);
  });

  it("undoing make unique repoints the clip and removes the fork", () => {
    song().apply("Make unique", (d) => ops.makeUnique(d, "c2", "p2", () => "n"));
    expect(song().doc.clips["c2"]!.patternId).toBe("p2");
    expect(song().doc.patterns["p2"]).toBeDefined();

    song().undo();
    expect(song().doc.clips["c2"]!.patternId).toBe("p1");
    expect(song().doc.patterns["p2"]).toBeUndefined();
  });

  it("a fader drag is one undo step", () => {
    song().begin("Volume");
    for (const v of [-1, -2, -3, -4, -5]) song().apply("Volume", (d) => ops.setMix(d, "drums", { volume: v }));
    song().commit();
    expect(song().doc.tracks["drums"]!.mix.volume).toBe(-5);

    song().undo();
    expect(song().doc.tracks["drums"]!.mix.volume).toBe(0);
    expect(song().canUndo).toBe(false);
  });

  it("load replaces the document and forgets history", () => {
    song().apply("Move clip", (d) => ops.moveClip(d, "c1", BAR));
    song().load(emptySong("s2", "Other"));
    expect(song().doc.id).toBe("s2");
    expect(song().canUndo).toBe(false);
    expect(song().canRedo).toBe(false);
  });
});

describe("ui store", () => {
  it("the editing pattern is derived through the clip, so undo cannot strand it", () => {
    ui().setEditingClip("c2");
    song().apply("Make unique", (d) => ops.makeUnique(d, "c2", "p2", () => "n"));
    expect(selectEditingPattern(song().doc, ui().editingClipId)?.id).toBe("p2");

    song().undo();
    expect(selectEditingPattern(song().doc, ui().editingClipId)?.id).toBe("p1");
  });

  it("selection is pruned when the selected clip disappears", async () => {
    const unwire = wireStores();
    ui().select(["c1", "c2"]);
    ui().setEditingClip("c1");
    song().apply("Delete", (d) => ops.removeClip(d, "c1"));
    await Promise.resolve();
    expect(ui().selectedClipIds).toEqual(["c2"]);
    expect(ui().editingClipId).toBeNull();
    unwire();
  });

  it("pruning does not fire a state change when nothing was stale", () => {
    ui().select(["c1"]);
    const before = useUiStore.getState();
    ui().pruneAgainst(song().doc);
    expect(useUiStore.getState()).toBe(before);
  });

  it("zoom is clamped to a sane range", () => {
    ui().setZoom(1);
    expect(ui().pxPerBar).toBe(16);
    ui().setZoom(10_000);
    expect(ui().pxPerBar).toBe(800);
  });
});
