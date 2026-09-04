import type { Clip, Pattern } from "@hpi/shared";
import * as Tone from "tone";

import type { Graph } from "./buildGraph.ts";
import { clipWindow, patternEvents } from "./schedule.ts";
import type { PatternEvent } from "./schedule.ts";

/**
 * One Tone.Part per clip placement. The event list is the pattern, so every
 * placement of a shared pattern gets an identical list and a pattern edit is
 * "rebuild N parts from one array". The part loops the pattern for the length
 * of the clip and stops at the clip's end.
 *
 * The callback looks the track up on every note rather than capturing the
 * voice, so swapping an instrument does not require touching the parts.
 */
export function createPart(clip: Clip, pattern: Pattern, graph: Graph): Tone.Part<PatternEvent> {
  const window = clipWindow(clip, pattern);
  const part = new Tone.Part<PatternEvent>((time, event) => {
    const nodes = graph.tracks.get(clip.trackId);
    if (!nodes) return;
    nodes.voice.trigger(event.pitch, time, event.velocity, Tone.Ticks(event.durationTicks).toSeconds());
  }, patternEvents(pattern));

  part.loop = true;
  part.loopStart = 0;
  part.loopEnd = `${window.loopEndTicks}i`;
  part.start(`${window.startTick}i`, `${window.offsetTicks}i`);
  part.stop(`${window.stopTick}i`);
  return part;
}
