import { automationFrom, automationValueAt, laneIsActive, MIX_AUTOMATION_PARAMS } from "@hpi/shared";
import type { AutomationLane, MixAutomationParam, SongDoc, Track } from "@hpi/shared";
import * as Tone from "tone";

import type { Graph, TrackNodes } from "./buildGraph.ts";

/**
 * Automation as scheduled Web Audio ramps.
 *
 * Every lane targets a `Tone.Param`, so a lane becomes one `setValueAtTime`
 * for where it stands at the playhead plus one `linearRampToValueAtTime` per
 * point ahead. That is sample-accurate, costs nothing per frame, and the same
 * call works inside `Tone.Offline`. The price is that anything that moves the
 * playhead (play, seek, loop wrap, tempo change) must reschedule, which the
 * engine does from one place.
 */
type Rampable = {
  cancelAndHoldAtTime(time: number): unknown;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
};

/**
 * Tone converts decibels to gain before ramping, so a linear ramp in gain is a
 * curve in dB. An exponential gain ramp is a straight line in dB, which is what
 * the lane draws and what `automationValueAt` assumes when a seek lands mid-ramp.
 */
const isDecibels = (param: MixAutomationParam): boolean => param === "volume";

export function automationTarget(nodes: TrackNodes, param: MixAutomationParam): Rampable {
  switch (param) {
    case "volume":
      return nodes.volumeAuto.volume;
    case "pan":
      return nodes.channel.pan;
    case "sendReverb":
      return nodes.reverbSend.gain;
    case "sendDelay":
      return nodes.delaySend.gain;
  }
}

export function scheduleLane(target: Rampable, lane: AutomationLane, fromTick: number, at: number, exponential = false): void {
  const plan = automationFrom(lane, fromTick);
  if (!plan) return;
  target.cancelAndHoldAtTime(at);
  target.setValueAtTime(plan.start, at);
  for (const point of plan.points) {
    const time = at + Tone.Ticks(point.tick - fromTick).toSeconds();
    if (exponential) target.exponentialRampToValueAtTime(point.value, time);
    else target.linearRampToValueAtTime(point.value, time);
  }
}

export function scheduleTrackAutomation(nodes: TrackNodes, track: Track, fromTick: number, at: number): void {
  for (const param of MIX_AUTOMATION_PARAMS) {
    const lane = track.automation[param];
    if (laneIsActive(lane)) scheduleLane(automationTarget(nodes, param), lane, fromTick, at, isDecibels(param));
  }
}

export function cancelTrackAutomation(nodes: TrackNodes, at: number): void {
  for (const param of MIX_AUTOMATION_PARAMS) automationTarget(nodes, param).cancelAndHoldAtTime(at);
}

/**
 * Stopped: every lane parks at the lane's value for the playhead, so live
 * notes sound the way that position would, not wherever a ramp happened to be
 * when Stop was pressed.
 */
export function holdTrackAutomation(nodes: TrackNodes, track: Track, tick: number, at: number): void {
  for (const param of MIX_AUTOMATION_PARAMS) {
    const target = automationTarget(nodes, param);
    target.cancelAndHoldAtTime(at);
    const lane = track.automation[param];
    if (!laneIsActive(lane)) continue;
    const value = automationValueAt(lane, tick);
    if (value !== undefined) target.setValueAtTime(value, at);
  }
}

export function scheduleAllAutomation(graph: Graph, doc: SongDoc, fromTick: number, at: number): void {
  for (const [id, nodes] of graph.tracks) {
    const track = doc.tracks[id];
    if (track) scheduleTrackAutomation(nodes, track, fromTick, at);
  }
}
