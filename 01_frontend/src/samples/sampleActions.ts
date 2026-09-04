import { newId, ops } from "@hpi/shared";
import type { SampleRef } from "@hpi/shared";

import { api } from "../api/client.ts";
import type { Channels } from "../audio/index.ts";
import { normalise, reverse, trim, wavBlob } from "../audio/index.ts";
import { useSongStore, useUiStore } from "../state/index.ts";

const song = () => useSongStore.getState();

export type Capture = { channels: Channels; sampleRate: number; durationSec: number };
export type Shaping = { startSec: number; endSec: number; normalised: boolean; reversed: boolean };

/** Applies the shaping the panel shows, in the order the user would expect. */
export function shape(capture: Capture, shaping: Shaping): Channels {
  let out = trim(capture.channels, capture.sampleRate, shaping.startSec, shaping.endSec);
  if (shaping.normalised) out = normalise(out);
  if (shaping.reversed) out = reverse(out);
  return out;
}

/**
 * Uploads the shaped audio and adds a reference to the song. If the API is
 * unreachable the reference points at a blob URL, which works until the page
 * reloads; the save status already says the app is offline.
 */
export async function saveSample(capture: Capture, shaping: Shaping, name: string): Promise<SampleRef> {
  const channels = shape(capture, shaping);
  const blob = wavBlob(channels, capture.sampleRate);
  const durationSec = (channels[0]?.length ?? 0) / capture.sampleRate;
  const base = { name: name.trim() || "Sample", durationSec, trimStartSec: shaping.startSec, trimEndSec: shaping.endSec, normalised: shaping.normalised, reversed: shaping.reversed };
  let ref: SampleRef;
  try {
    const uploaded = await api.uploadSample(blob, base.name, durationSec);
    ref = { ...base, id: uploaded.id, url: uploaded.url };
  } catch {
    ref = { ...base, id: newId(), url: URL.createObjectURL(blob) };
    useUiStore.getState().setSaveState("offline");
  }
  song().apply("Add sample", (d) => ops.addSample(d, ref));
  return ref;
}

export function removeSample(sampleId: string): void {
  song().apply("Remove sample", (d) => ops.removeSample(d, sampleId));
  void api.deleteSample(sampleId).catch(() => undefined);
}

/** Puts the sample on a track as its instrument. */
export function useSampleOn(trackId: string, sampleId: string): void {
  song().apply("Use sample", (d) => ops.setInstrument(d, trackId, { kind: "sampler", params: {}, sampleId }));
}

/** Server samples not yet referenced by this song, so they can be imported. */
export async function unreferencedServerSamples(): Promise<{ id: string; name: string; url: string; durationSec: number }[]> {
  try {
    const all = await api.listSamples();
    const have = song().doc.samples;
    return all.filter((s) => !have[s.id]);
  } catch {
    return [];
  }
}

export function importSample(s: { id: string; name: string; url: string; durationSec: number }): void {
  song().apply("Import sample", (d) =>
    ops.addSample(d, { id: s.id, name: s.name, url: s.url, durationSec: s.durationSec, trimStartSec: 0, trimEndSec: s.durationSec, normalised: false, reversed: false }),
  );
}
