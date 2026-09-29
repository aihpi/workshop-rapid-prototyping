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

describe("effects", () => {
  const fx = (id: string, kind: "filter" | "reverb" | "compressor" = "filter") => ({ id, kind, enabled: true, params: {} });

  it("adds in order, at an index, and removes by id", () => {
    const song = fixture();
    ops.addEffect(song, "drums", fx("a"));
    ops.addEffect(song, "drums", fx("c", "reverb"));
    ops.addEffect(song, "drums", fx("b", "compressor"), 1);
    expect(song.tracks["drums"]!.effects.map((e) => e.id)).toEqual(["a", "b", "c"]);
    ops.removeEffect(song, "drums", "b");
    expect(song.tracks["drums"]!.effects.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("moves within the chain and clamps the target", () => {
    const song = fixture();
    for (const id of ["a", "b", "c"]) ops.addEffect(song, "drums", fx(id));
    ops.moveEffect(song, "drums", "c", 0);
    expect(song.tracks["drums"]!.effects.map((e) => e.id)).toEqual(["c", "a", "b"]);
    ops.moveEffect(song, "drums", "c", 99);
    expect(song.tracks["drums"]!.effects.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("toggles and sets params without touching the rest", () => {
    const song = fixture();
    ops.addEffect(song, "drums", fx("a"));
    ops.setEffectEnabled(song, "drums", "a", false);
    ops.setEffectParam(song, "drums", "a", "frequency", 440);
    ops.setEffectParam(song, "drums", "a", "type", "highpass");
    expect(song.tracks["drums"]!.effects[0]).toEqual({ id: "a", kind: "filter", enabled: false, params: { frequency: 440, type: "highpass" } });
  });
});

describe("automation", () => {
  it("upserts points and keeps them sorted", () => {
    const song = fixture();
    ops.setAutomationPoint(song, "drums", "volume", 400, -6);
    ops.setAutomationPoint(song, "drums", "volume", 0, -30);
    ops.setAutomationPoint(song, "drums", "volume", 400, -3);
    expect(song.tracks["drums"]!.automation["volume"]!.points).toEqual([
      { tick: 0, value: -30 },
      { tick: 400, value: -3 },
    ]);
  });

  it("removing the last point removes the lane", () => {
    const song = fixture();
    ops.setAutomationPoint(song, "drums", "pan", 0, -1);
    ops.removeAutomationPoint(song, "drums", "pan", 0);
    expect(song.tracks["drums"]!.automation["pan"]).toBeUndefined();
  });

  it("replacing a lane sorts, dedupes with last-wins, and clears on empty", () => {
    const song = fixture();
    ops.setAutomationLane(song, "drums", "sendReverb", [
      { tick: 200, value: 0.5 },
      { tick: 0, value: 0 },
      { tick: 200, value: 0.9 },
    ]);
    expect(song.tracks["drums"]!.automation["sendReverb"]!.points).toEqual([
      { tick: 0, value: 0 },
      { tick: 200, value: 0.9 },
    ]);
    ops.setAutomationLane(song, "drums", "sendReverb", []);
    expect(song.tracks["drums"]!.automation["sendReverb"]).toBeUndefined();
  });
});

describe("quantise and velocity", () => {
  const S = STEP_TICKS;

  it("snaps to the grid at full strength and halfway at half", () => {
    const song = fixture();
    ops.addNote(song, "p1", { id: "a", start: 3 * S + 10, duration: S, pitch: 36, velocity: 1 });
    ops.addNote(song, "p1", { id: "b", start: S + 20, duration: S, pitch: 38, velocity: 1 });
    ops.quantiseNotes(song, "p1", ["a"], S);
    ops.quantiseNotes(song, "p1", ["b"], S, 0.5);
    const starts = Object.fromEntries(song.patterns["p1"]!.notes.map((n) => [n.id, n.start]));
    expect(starts["a"]).toBe(3 * S);
    expect(starts["b"]).toBe(S + 10);
  });

  it("never pushes a note onto the pattern's end and leaves unlisted notes alone", () => {
    const song = fixture();
    ops.addNote(song, "p1", { id: "late", start: BAR - 5, duration: S, pitch: 36, velocity: 1 });
    ops.addNote(song, "p1", { id: "other", start: 7, duration: S, pitch: 36, velocity: 1 });
    ops.quantiseNotes(song, "p1", ["late"], S);
    const starts = Object.fromEntries(song.patterns["p1"]!.notes.map((n) => [n.id, n.start]));
    expect(starts["late"]).toBe(BAR - S);
    expect(starts["other"]).toBe(7);
  });

  it("clamps velocity to 0..1", () => {
    const song = fixture();
    ops.addNote(song, "p1", { id: "a", start: 0, duration: S, pitch: 36, velocity: 0.5 });
    ops.setNoteVelocity(song, "p1", ["a"], 1.7);
    expect(song.patterns["p1"]!.notes[0]!.velocity).toBe(1);
    ops.setNoteVelocity(song, "p1", ["a"], -2);
    expect(song.patterns["p1"]!.notes[0]!.velocity).toBe(0);
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
