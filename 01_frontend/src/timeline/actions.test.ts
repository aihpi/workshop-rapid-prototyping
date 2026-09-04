import { emptySong, makeTrack, ops, ticksPerBar } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { useSongStore, useUiStore } from "../state/index.ts";
import { actions } from "./actions.ts";

const BAR = ticksPerBar([4, 4]);

function fixture(): SongDoc {
  const song = emptySong("s1");
  ops.addTrack(song, makeTrack({ id: "drums", name: "Drums", kind: "drum" }));
  ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched" }));
  ops.addPattern(song, { id: "p1", name: "Hook", kind: "drum", lengthTicks: BAR, notes: [] });
  ops.addClip(song, { id: "c1", trackId: "drums", patternId: "p1", startTick: 0, lengthTicks: BAR, offsetTicks: 0 });
  return song;
}

const doc = () => useSongStore.getState().doc;
const ui = () => useUiStore.getState();

beforeEach(() => {
  useSongStore.getState().load(fixture());
  ui().clearSelection();
  ui().setEditingClip(null);
});

describe("timeline actions", () => {
  it("adding a clip creates a pattern of the track's kind and opens it for editing", () => {
    actions.addClipAt("bass", 2 * BAR);
    const clip = Object.values(doc().clips).find((c) => c.trackId === "bass")!;
    expect(clip.startTick).toBe(2 * BAR);
    expect(doc().patterns[clip.patternId]!.kind).toBe("pitched");
    expect(ui().selectedClipIds).toEqual([clip.id]);
    expect(ui().editingClipId).toBe(clip.id);
    expect(useSongStore.getState().undoLabel).toBe("Add clip");
  });

  it("duplicating keeps the copy linked to the same pattern, placed right after", () => {
    ui().select(["c1"]);
    actions.duplicateSelected();
    const clips = Object.values(doc().clips);
    expect(clips).toHaveLength(2);
    const copy = clips.find((c) => c.id !== "c1")!;
    expect(copy.patternId).toBe("p1");
    expect(copy.startTick).toBe(BAR);
    expect(ui().selectedClipIds).toEqual([copy.id]);
  });

  it("moving several clips is one undo step", () => {
    ui().select(["c1"]);
    actions.duplicateSelected();
    const copyId = ui().selectedClipIds[0]!;
    actions.moveClips([
      { clipId: "c1", startTick: 4 * BAR },
      { clipId: copyId, startTick: 5 * BAR },
    ]);
    expect(doc().clips["c1"]!.startTick).toBe(4 * BAR);
    useSongStore.getState().undo();
    expect(doc().clips["c1"]!.startTick).toBe(0);
    expect(doc().clips[copyId]!.startTick).toBe(BAR);
  });

  it("delete removes the selection and clears it", () => {
    ui().select(["c1"]);
    actions.deleteSelected();
    expect(doc().clips["c1"]).toBeUndefined();
    expect(doc().patterns["p1"]).toBeDefined();
    expect(ui().selectedClipIds).toEqual([]);
  });

  it("make unique forks only the selected clip", () => {
    ui().select(["c1"]);
    actions.duplicateSelected();
    const copyId = ui().selectedClipIds[0]!;
    actions.makeUniqueSelected();
    expect(doc().clips[copyId]!.patternId).not.toBe("p1");
    expect(doc().clips["c1"]!.patternId).toBe("p1");
  });

  it("mute and solo toggle with readable labels", () => {
    actions.toggleMute("drums");
    expect(doc().tracks["drums"]!.mix.mute).toBe(true);
    expect(useSongStore.getState().undoLabel).toBe("Mute");
    actions.toggleSolo("bass");
    expect(doc().tracks["bass"]!.mix.solo).toBe(true);
    actions.toggleMute("drums");
    expect(useSongStore.getState().undoLabel).toBe("Unmute");
  });

  it("a new section starts on the bar under the playhead and lasts four bars", () => {
    actions.addSectionAt(2 * BAR + 100);
    expect(doc().sections[0]).toMatchObject({ startTick: 2 * BAR, endTick: 6 * BAR, name: "Section 1" });
  });

  it("new tracks cycle through the brand swatches", () => {
    actions.addTrack("pitched", "poly", "Keys");
    actions.addTrack("pitched", "fm", "Brass");
    actions.addTrack("pitched", "pluck", "Guitar");
    const colours = doc().trackOrder.map((id) => doc().tracks[id]!.colour);
    expect(colours.map((c) => c.hue)).toEqual(["red", "red", "yellow", "grey", "red"]);
    expect(colours[4]!.shade).toBe(75);
  });
});
