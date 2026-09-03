import { emptySong, makeTrack, ops, ticksPerBar } from "@hpi/shared";
import type { Clip, Pattern, SongDoc, Track } from "@hpi/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { useSongStore } from "../state/index.ts";
import { reconcile } from "./reconcile.ts";
import type { EngineLike } from "./reconcile.ts";

const BAR = ticksPerBar([4, 4]);

class Recorder implements EngineLike {
  calls: string[] = [];
  addTrack(t: Track) { this.calls.push(`addTrack ${t.id}`); }
  removeTrack(id: string) { this.calls.push(`removeTrack ${id}`); }
  setMix(t: Track) { this.calls.push(`setMix ${t.id}`); }
  setInstrumentParams(t: Track) { this.calls.push(`setInstrumentParams ${t.id}`); }
  rebuildInstrument(t: Track) { this.calls.push(`rebuildInstrument ${t.id}`); }
  syncClip(c: Clip, p: Pattern) { this.calls.push(`syncClip ${c.id}<-${p.id}`); }
  removeClip(id: string) { this.calls.push(`removeClip ${id}`); }
  setBpm(bpm: number) { this.calls.push(`setBpm ${bpm}`); }
}

function fixture(): SongDoc {
  const song = emptySong("s1");
  ops.addTrack(song, makeTrack({ id: "drums", name: "Drums", kind: "drum" }));
  ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched", instrument: { kind: "pluck", params: {} } }));
  ops.addPattern(song, { id: "p1", name: "Hook", kind: "drum", lengthTicks: BAR, notes: [] });
  ops.addPattern(song, { id: "p2", name: "Line", kind: "pitched", lengthTicks: BAR, notes: [] });
  ops.addClip(song, { id: "c1", trackId: "drums", patternId: "p1", startTick: 0, lengthTicks: BAR, offsetTicks: 0 });
  ops.addClip(song, { id: "c2", trackId: "drums", patternId: "p1", startTick: 4 * BAR, lengthTicks: BAR, offsetTicks: 0 });
  ops.addClip(song, { id: "c3", trackId: "bass", patternId: "p2", startTick: 0, lengthTicks: BAR, offsetTicks: 0 });
  return song;
}

// Edits go through the real store so the documents share structure the way
// they do in the app. `prev` is captured before, `next` read after.
const store = () => useSongStore.getState();
function edit(recipe: (d: SongDoc) => void): [SongDoc, SongDoc] {
  const prev = store().doc;
  store().apply("test", recipe);
  return [prev, store().doc];
}

describe("reconcile", () => {
  let engine: Recorder;
  beforeEach(() => {
    store().load(fixture());
    engine = new Recorder();
  });

  it("from nothing, builds every track and clip and sets the tempo", () => {
    reconcile(null, store().doc, engine);
    expect(engine.calls).toEqual([
      "setBpm 120",
      "addTrack drums",
      "addTrack bass",
      "syncClip c1<-p1",
      "syncClip c2<-p1",
      "syncClip c3<-p2",
    ]);
  });

  it("the same document twice does nothing", () => {
    const doc = store().doc;
    reconcile(doc, doc, engine);
    expect(engine.calls).toEqual([]);
  });

  it("one note toggle reschedules only that pattern's placements, touches no track", () => {
    const [prev, next] = edit((d) => ops.toggleStep(d, "p1", 36, 0, 48, "n1"));
    reconcile(prev, next, engine);
    expect(engine.calls).toEqual(["syncClip c1<-p1", "syncClip c2<-p1"]);
  });

  it("a mix change touches one track and no clips", () => {
    const [prev, next] = edit((d) => ops.setMix(d, "bass", { volume: -6 }));
    reconcile(prev, next, engine);
    expect(engine.calls).toEqual(["setMix bass"]);
  });

  it("params change updates in place, kind change rebuilds", () => {
    const [p1, n1] = edit((d) => ops.setInstrumentParam(d, "bass", "dampening", 500));
    reconcile(p1, n1, engine);
    expect(engine.calls).toEqual(["setInstrumentParams bass"]);

    engine.calls = [];
    const [p2, n2] = edit((d) => ops.setInstrument(d, "bass", { kind: "fm", params: {} }));
    reconcile(p2, n2, engine);
    expect(engine.calls).toEqual(["rebuildInstrument bass"]);
  });

  it("moving a clip reschedules just that clip", () => {
    const [prev, next] = edit((d) => ops.moveClip(d, "c2", 8 * BAR));
    reconcile(prev, next, engine);
    expect(engine.calls).toEqual(["syncClip c2<-p1"]);
  });

  it("removing a track removes it and its clips", () => {
    const [prev, next] = edit((d) => ops.removeTrack(d, "drums"));
    reconcile(prev, next, engine);
    expect(engine.calls).toEqual(["removeTrack drums", "removeClip c1", "removeClip c2"]);
  });

  it("make unique reschedules only the forked clip", () => {
    const [prev, next] = edit((d) => ops.makeUnique(d, "c2", "p3", () => "n"));
    reconcile(prev, next, engine);
    expect(engine.calls).toEqual(["syncClip c2<-p3"]);
  });

  it("a tempo change is one call", () => {
    const [prev, next] = edit((d) => ops.setBpm(d, 128));
    reconcile(prev, next, engine);
    expect(engine.calls).toEqual(["setBpm 128"]);
  });

  it("undo goes through exactly the same path as the edit it reverses", () => {
    const [prev, edited] = edit((d) => ops.toggleStep(d, "p1", 36, 0, 48, "n1"));
    reconcile(prev, edited, engine);
    const forward = [...engine.calls];

    engine.calls = [];
    store().undo();
    const undone = store().doc;
    reconcile(edited, undone, engine);

    expect(engine.calls).toEqual(forward);
    expect(undone).toEqual(prev);
  });
});
