import { demoSong } from "@hpi/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { useSongStore, useUiStore } from "../state/index.ts";
import { aiActions } from "./aiActions.ts";
import { describeOp } from "./describeOp.ts";

const store = () => useSongStore.getState();

beforeEach(() => store().load(demoSong()));

describe("aiActions.applyOps", () => {
  it("applies a whole batch as one undo step labelled with the prompt", () => {
    const before = store().doc;
    const result = aiActions.applyOps("make it faster and add a sax", [
      { op: "setBpm", bpm: 130 },
      { op: "addTrack", id: "sax", name: "Sax", kind: "pitched", instrument: "fm" },
      { op: "addPattern", id: "sax-line", name: "Sax line", kind: "pitched", bars: 1, notes: [{ pitch: 65, step: 0, len: 4 }] },
      { op: "addClip", id: "sax-1", trackId: "sax", patternId: "sax-line", bar: 14, bars: 8 },
    ]);
    expect(result.applied).toHaveLength(4);
    expect(store().doc.meta.bpm).toBe(130);
    expect(store().doc.tracks["sax"]).toBeDefined();
    expect(store().undoLabel).toBe("AI: make it faster and add a sax");
    store().undo();
    expect(store().doc).toEqual(before);
    expect(store().canUndo).toBe(false);
  });

  it("surfaces rejected ops and drops UI references to clips it removed", () => {
    useUiStore.getState().select(["c4-guitar-verse"]);
    useUiStore.getState().setEditingClip("c4-guitar-verse");
    const result = aiActions.applyOps("drop the guitar", [
      { op: "removeClip", clipId: "c4-guitar-verse" },
      { op: "removeClip", clipId: "nothing-here" },
    ]);
    expect(result.applied).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({ index: 1, reason: 'no clip "nothing-here"' });
    expect(useUiStore.getState().selectedClipIds).toEqual([]);
    expect(useUiStore.getState().editingClipId).toBeNull();
  });

  it("does nothing for an empty batch", () => {
    aiActions.applyOps("what key?", []);
    expect(store().canUndo).toBe(false);
  });
});

describe("describeOp", () => {
  it("speaks in track and pattern names", () => {
    const doc = store().doc;
    expect(describeOp({ op: "setMix", trackId: "keys", volume: -3, pan: -0.8, reverb: 0.7 }, doc)).toBe("Keys: volume -3 dB, pan 80% left, reverb 0.7");
    expect(describeOp({ op: "addClip", id: "x", trackId: "brass", patternId: "brass-hook", bar: 14, bars: 8 }, doc)).toBe("Brass: Brass hits at bar 15 for 8 bars");
    expect(describeOp({ op: "makeUnique", clipId: "c4-guitar-verse", newPatternId: "g2" }, doc)).toBe("Guitar clip at bar 3 made unique");
  });

  it("names effects, lanes and grids in the same voice", () => {
    const doc = store().doc;
    expect(describeOp({ op: "addEffect", trackId: "drums", id: "x", kind: "compressor" }, doc)).toBe("Drums: added Compressor");
    expect(describeOp({ op: "removeEffect", trackId: "drums", effectId: "drums-comp" }, doc)).toBe("Drums: removed Compressor");
    expect(describeOp({ op: "setEffectParam", trackId: "drums", effectId: "drums-comp", key: "threshold", value: -18 }, doc)).toBe("Drums Compressor: threshold -18");
    expect(describeOp({ op: "setEffectEnabled", trackId: "drums", effectId: "drums-comp", enabled: false }, doc)).toBe("Drums Compressor: bypassed");
    expect(describeOp({ op: "setEffectEnabled", trackId: "drums", effectId: "drums-comp", enabled: true }, doc)).toBe("Drums Compressor: on");
    expect(describeOp({ op: "setTimeSig", beats: 3, unit: 4 }, doc)).toBe("Time signature 3/4");
    expect(describeOp({ op: "setAutomation", trackId: "keys", param: "volume", points: [{ bar: 0, value: -30 }, { bar: 1, value: -20 }, { bar: 2, value: -8 }] }, doc)).toBe("Keys: volume automation, 3 points");
    expect(describeOp({ op: "setAutomation", trackId: "keys", param: "sendReverb", points: [] }, doc)).toBe("Keys: reverb send automation cleared");
    expect(describeOp({ op: "quantiseNotes", patternId: "brass-hook", grid: "1/8" }, doc)).toBe("Brass hits: quantised to 1/8");
    expect(describeOp({ op: "quantiseNotes", patternId: "brass-hook" }, doc)).toBe("Brass hits: quantised to 1/16");
  });
});
