import { ops } from "@hpi/shared";
import type { InstrumentKind, Mix } from "@hpi/shared";

import { useSongStore } from "../state/index.ts";

/**
 * Mixer and sound-design edits. Continuous controls call `begin` on
 * pointerdown and `end` on release, so a whole fader drag is one undo step
 * however many `input` events fire on the way.
 */
const song = () => useSongStore.getState();

export const mixerActions = {
  begin(label: string): void {
    song().begin(label);
  },
  end(): void {
    song().commit();
  },

  setVolume(trackId: string, db: number): void {
    song().apply("Volume", (d) => ops.setMix(d, trackId, { volume: db }));
  },
  setPan(trackId: string, pan: number): void {
    song().apply("Pan", (d) => ops.setMix(d, trackId, { pan }));
  },
  setSend(trackId: string, send: keyof Mix["sends"], amount: number): void {
    song().apply(send === "reverb" ? "Reverb send" : "Delay send", (d) => ops.setSend(d, trackId, send, amount));
  },
  setMasterVolume(db: number): void {
    song().apply("Master volume", (d) => ops.setMasterVolume(d, db));
  },

  /** Changing the synth resets its params; the old ones would mean nothing to the new one. */
  setInstrumentKind(trackId: string, kind: InstrumentKind, sampleId?: string): void {
    song().apply("Change instrument", (d) =>
      ops.setInstrument(d, trackId, sampleId ? { kind, params: {}, sampleId } : { kind, params: {} }),
    );
  },
  setParam(trackId: string, key: string, value: number): void {
    song().apply("Sound", (d) => ops.setInstrumentParam(d, trackId, key, value));
  },
};
