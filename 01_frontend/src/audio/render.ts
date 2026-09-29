import { ops, PPQ } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";
import * as Tone from "tone";

import { scheduleAllAutomation } from "./automation.ts";
import { buildGraph } from "./buildGraph.ts";
import { createPart } from "./parts.ts";
import { audioBufferChannels, wavBlob } from "./wav.ts";

/**
 * The whole song to a WAV, faster than real time. `Tone.Offline` gives the
 * callback a fresh context, and because `buildGraph` creates its nodes in
 * whatever context is current, the exact graph the user has been listening to
 * is rebuilt inside it. OfflineAudioContext is not available in Workers, so
 * this blocks the main thread; the caller shows a modal.
 */
export const TAIL_SECONDS = 2;

export function songDurationSeconds(doc: SongDoc): number {
  const beats = ops.songEndTick(doc) / PPQ;
  return (beats * 60) / doc.meta.bpm + TAIL_SECONDS;
}

export async function renderSong(doc: SongDoc): Promise<Blob> {
  const seconds = songDurationSeconds(doc);
  const buffer = await Tone.Offline(async ({ transport }) => {
    transport.bpm.value = doc.meta.bpm;
    const graph = buildGraph(doc);
    await graph.ready;
    await Tone.loaded();
    for (const clip of Object.values(doc.clips)) {
      const pattern = doc.patterns[clip.patternId];
      if (pattern) createPart(clip, pattern, graph);
    }
    scheduleAllAutomation(graph, doc, 0, 0);
    transport.start(0);
  }, seconds);
  const audio = buffer.get();
  if (!audio) throw new Error("offline render produced no audio");
  return wavBlob(audioBufferChannels(audio), audio.sampleRate);
}

/** Hands the browser a file to save. The object URL is released once the click has been dispatched. */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
