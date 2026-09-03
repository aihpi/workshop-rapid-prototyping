import { emptySong, makeTrack, ops } from "@hpi/shared";
import { beforeEach, describe, expect, it } from "vitest";

import { useSongStore } from "../state/index.ts";
import { mixerActions } from "./mixerActions.ts";

const store = () => useSongStore.getState();

beforeEach(() => {
  const song = emptySong("s1");
  ops.addTrack(song, makeTrack({ id: "bass", name: "Bass", kind: "pitched", instrument: { kind: "pluck", params: { dampening: 500 } } }));
  store().load(song);
});

describe("mixer actions", () => {
  it("a fader drag is one undo step regardless of how many input events fire", () => {
    mixerActions.begin("Volume");
    for (const v of [-1, -2, -3, -4, -5, -6]) mixerActions.setVolume("bass", v);
    mixerActions.end();
    expect(store().doc.tracks["bass"]!.mix.volume).toBe(-6);
    expect(store().undoLabel).toBe("Volume");
    store().undo();
    expect(store().doc.tracks["bass"]!.mix.volume).toBe(0);
    expect(store().canUndo).toBe(false);
  });

  it("master volume clamps to the fader range", () => {
    mixerActions.setMasterVolume(20);
    expect(store().doc.meta.masterVolume).toBe(6);
  });

  it("changing the instrument kind resets its params", () => {
    mixerActions.setInstrumentKind("bass", "fm");
    expect(store().doc.tracks["bass"]!.instrument).toEqual({ kind: "fm", params: {} });
  });

  it("a param edit is labelled and undoable", () => {
    mixerActions.setParam("bass", "resonance", 0.7);
    expect(store().doc.tracks["bass"]!.instrument.params["resonance"]).toBe(0.7);
    expect(store().undoLabel).toBe("Sound");
  });
});
