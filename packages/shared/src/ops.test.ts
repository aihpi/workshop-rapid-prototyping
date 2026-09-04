import { describe, expect, it } from "vitest";

import { emptySong, makeTrack } from "./factory.ts";
import { STEP_TICKS, ticksPerBar } from "./music.ts";
import * as ops from "./ops.ts";
import type { SongDoc } from "./song.ts";

const BAR = ticksPerBar([4, 4]);

/** A song with one drum track, one one-bar pattern, and two clips sharing it. */
function fixture(): SongDoc {
  const song = emptySong("s1");
  ops.addTrack(song, makeTrack({ id: "drums", name: "Drums", kind: "drum" }));
  ops.addPattern(song, { id: "p1", name: "Hook", kind: "drum", lengthTicks: BAR, notes: [] });
  ops.addClip(song, { id: "c1", trackId: "drums", patternId: "p1", startTick: 0, lengthTicks: BAR, offsetTicks: 0 });
  ops.addClip(song, { id: "c2", trackId: "drums", patternId: "p1", startTick: 4 * BAR, lengthTicks: BAR, offsetTicks: 0 });
  return song;
}

describe("linked clips", () => {
  it("two clips of one pattern hear the same edit", () => {
    const song = fixture();
    ops.toggleStep(song, "p1", 36, 0, STEP_TICKS, "n1");
    expect(song.patterns["p1"]!.notes).toHaveLength(1);
    expect(song.clips["c1"]!.patternId).toBe(song.clips["c2"]!.patternId);
    expect(ops.placementCount(song, "p1")).toBe(2);
  });

  it("make unique forks a copy and repoints only that clip", () => {
    const song = fixture();
    ops.toggleStep(song, "p1", 36, 0, STEP_TICKS, "n1");
    let n = 0;
    ops.makeUnique(song, "c2", "p2", () => `fork-${n++}`);

    expect(song.clips["c1"]!.patternId).toBe("p1");
    expect(song.clips["c2"]!.patternId).toBe("p2");
    expect(song.patterns["p2"]!.notes).toHaveLength(1);
    expect(song.patterns["p2"]!.notes[0]!.id).toBe("fork-0");
    expect(song.patterns["p2"]!.name).toBe("Hook copy");

    ops.toggleStep(song, "p2", 38, STEP_TICKS, STEP_TICKS, "n2");
    expect(song.patterns["p1"]!.notes).toHaveLength(1);
    expect(song.patterns["p2"]!.notes).toHaveLength(2);
  });

  it("removing a clip leaves the pattern alone", () => {
    const song = fixture();
    ops.removeClip(song, "c1");
    ops.removeClip(song, "c2");
    expect(song.patterns["p1"]).toBeDefined();
    expect(ops.placementCount(song, "p1")).toBe(0);
  });

  it("the save-time sweep removes orphans and nothing else", () => {
    const song = fixture();
    ops.addPattern(song, { id: "orphan", name: "Unused", kind: "drum", lengthTicks: BAR, notes: [] });
    ops.removeOrphanPatterns(song);
    expect(song.patterns["p1"]).toBeDefined();
    expect(song.patterns["orphan"]).toBeUndefined();
  });
});

describe("clips on the timeline", () => {
  it("moves and clamps at zero", () => {
    const song = fixture();
    ops.moveClip(song, "c1", -500);
    expect(song.clips["c1"]!.startTick).toBe(0);
    ops.moveClip(song, "c1", 2 * BAR);
    expect(song.clips["c1"]!.startTick).toBe(2 * BAR);
  });

  it("can move across tracks", () => {
    const song = fixture();
    ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched" }));
    ops.moveClip(song, "c1", BAR, "bass");
    expect(song.clips["c1"]!.trackId).toBe("bass");
  });

  it("resize never goes below one tick", () => {
    const song = fixture();
    ops.resizeClip(song, "c1", 0);
    expect(song.clips["c1"]!.lengthTicks).toBe(1);
  });

  it("reports where the song ends", () => {
    const song = fixture();
    expect(ops.songEndTick(song)).toBe(5 * BAR);
    ops.addSection(song, { id: "s", name: "Outro", startTick: 5 * BAR, endTick: 7 * BAR, colour: { hue: "grey", shade: 50 } });
    expect(ops.songEndTick(song)).toBe(7 * BAR);
  });
});

describe("tracks", () => {
  it("removing a track removes its clips and keeps order consistent", () => {
    const song = fixture();
    ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched" }));
    ops.removeTrack(song, "drums");
    expect(song.trackOrder).toEqual(["bass"]);
    expect(Object.keys(song.clips)).toHaveLength(0);
    expect(song.patterns["p1"]).toBeDefined();
  });

  it("reorders", () => {
    const song = fixture();
    ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched" }));
    ops.addTrack(song, makeTrack({ id: "keys", name: "Keys", kind: "pitched" }));
    ops.moveTrack(song, "keys", 0);
    expect(song.trackOrder).toEqual(["keys", "drums", "bass"]);
  });

  it("removing a sample detaches every track that used it", () => {
    const song = fixture();
    ops.addSample(song, { id: "smp", name: "clap", url: "/uploads/x.wav", durationSec: 1, trimStartSec: 0, trimEndSec: 1, normalised: true, reversed: false });
    ops.setInstrument(song, "drums", { kind: "sampler", params: {}, sampleId: "smp" });
    ops.removeSample(song, "smp");
    expect(song.tracks["drums"]!.instrument.sampleId).toBeUndefined();
  });
});

describe("step grid", () => {
  it("toggling the same cell twice is a no-op", () => {
    const song = fixture();
    ops.toggleStep(song, "p1", 36, 0, STEP_TICKS, "n1");
    ops.toggleStep(song, "p1", 36, 0, STEP_TICKS, "n2");
    expect(song.patterns["p1"]!.notes).toHaveLength(0);
  });

  it("different pitches at the same tick coexist", () => {
    const song = fixture();
    ops.toggleStep(song, "p1", 36, 0, STEP_TICKS, "n1");
    ops.toggleStep(song, "p1", 42, 0, STEP_TICKS, "n2");
    expect(song.patterns["p1"]!.notes).toHaveLength(2);
  });
});

describe("pattern length", () => {
  it("shortening drops notes that fall off the end, lengthening keeps everything", () => {
    const song = fixture();
    ops.toggleStep(song, "p1", 36, 0, STEP_TICKS, "a");
    ops.toggleStep(song, "p1", 36, BAR / 2, STEP_TICKS, "b");
    ops.setPatternLength(song, "p1", BAR / 2);
    expect(song.patterns["p1"]!.notes.map((n) => n.id)).toEqual(["a"]);
    ops.setPatternLength(song, "p1", 4 * BAR);
    expect(song.patterns["p1"]!.lengthTicks).toBe(4 * BAR);
    expect(song.patterns["p1"]!.notes).toHaveLength(1);
  });

  it("renames", () => {
    const song = fixture();
    ops.renamePattern(song, "p1", "Chorus");
    expect(song.patterns["p1"]!.name).toBe("Chorus");
  });
});

describe("sections", () => {
  it("stay sorted by start", () => {
    const song = fixture();
    const grey = { hue: "grey", shade: 100 } as const;
    ops.addSection(song, { id: "hook", name: "Hook", startTick: 8 * BAR, endTick: 16 * BAR, colour: grey });
    ops.addSection(song, { id: "intro", name: "Intro", startTick: 0, endTick: 2 * BAR, colour: grey });
    ops.addSection(song, { id: "verse", name: "Verse", startTick: 2 * BAR, endTick: 8 * BAR, colour: grey });
    expect(song.sections.map((s) => s.id)).toEqual(["intro", "verse", "hook"]);
    ops.updateSection(song, "intro", { startTick: 20 * BAR, endTick: 22 * BAR });
    expect(song.sections.map((s) => s.id)).toEqual(["verse", "hook", "intro"]);
  });
});
