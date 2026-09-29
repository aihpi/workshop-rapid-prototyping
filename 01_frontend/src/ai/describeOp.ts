import { AUTOMATION_RANGES, EFFECT_LABELS, INSTRUMENT_LABELS, ticksPerBar } from "@hpi/shared";
import type { AiOp, SongDoc } from "@hpi/shared";

/**
 * One human line per applied op, looked up against the document after the
 * edit. Things the op removed are gone from that document, so `before` (the
 * document the batch started from) answers for those.
 */
export function describeOp(op: AiOp, doc: SongDoc, before: SongDoc = doc): string {
  const track = (id: string) => doc.tracks[id]?.name ?? before.tracks[id]?.name ?? id;
  const pattern = (id: string) => doc.patterns[id]?.name ?? id;
  const effect = (trackId: string, id: string) => {
    const e = (doc.tracks[trackId]?.effects ?? []).concat(before.tracks[trackId]?.effects ?? []).find((x) => x.id === id);
    return e ? EFFECT_LABELS[e.kind] : id;
  };
  const clip = (id: string) => {
    const c = doc.clips[id];
    return c ? `${track(c.trackId)} clip at bar ${Math.floor(c.startTick / ticksPerBar(doc.meta.timeSig)) + 1}` : `clip ${id}`;
  };
  const db = (v: number) => `${v > 0 ? "+" : ""}${v} dB`;
  const pan = (v: number) => (v === 0 ? "centre" : `${Math.round(Math.abs(v) * 100)}% ${v < 0 ? "left" : "right"}`);

  switch (op.op) {
    case "setBpm":
      return `Tempo ${op.bpm} BPM`;
    case "addTrack":
      return `New track "${op.name}" (${INSTRUMENT_LABELS[op.instrument]})`;
    case "renameTrack":
      return `Track renamed to "${op.name}"`;
    case "removeTrack":
      return `Removed track ${op.trackId}`;
    case "setInstrument":
      return `${track(op.trackId)}: instrument ${INSTRUMENT_LABELS[op.instrument]}`;
    case "setInstrumentParam":
      return `${track(op.trackId)}: ${op.key} ${op.value}`;
    case "setMix": {
      const parts = [
        op.volume !== undefined && `volume ${db(op.volume)}`,
        op.pan !== undefined && `pan ${pan(op.pan)}`,
        op.reverb !== undefined && `reverb ${op.reverb}`,
        op.delay !== undefined && `delay ${op.delay}`,
        op.mute !== undefined && (op.mute ? "muted" : "unmuted"),
        op.solo !== undefined && (op.solo ? "solo" : "solo off"),
      ].filter(Boolean);
      return `${track(op.trackId)}: ${parts.join(", ")}`;
    }
    case "addPattern":
      return `New pattern "${op.name}" (${op.bars} bars, ${op.notes.length} notes)`;
    case "replaceNotes":
      return `${pattern(op.patternId)}: ${op.notes.length} new notes`;
    case "rampVelocity":
      return `${pattern(op.patternId)}: velocity from ${op.from} to ${op.to}`;
    case "addClip":
      return `${track(op.trackId)}: ${pattern(op.patternId)} at bar ${op.bar + 1} for ${op.bars} bars`;
    case "resizeClip":
      return `${clip(op.clipId)}: ${op.bars} bars`;
    case "removeClip":
      return `Removed clip ${op.clipId}`;
    case "makeUnique":
      return `${clip(op.clipId)} made unique`;
    case "addSection":
      return `Section "${op.name}" at bar ${op.bar + 1} for ${op.bars} bars`;
    case "renameSection":
      return `Section renamed to "${op.name}"`;
    case "addEffect":
      return `${track(op.trackId)}: added ${EFFECT_LABELS[op.kind]}`;
    case "removeEffect":
      return `${track(op.trackId)}: removed ${effect(op.trackId, op.effectId)}`;
    case "setEffectParam":
      return `${track(op.trackId)} ${effect(op.trackId, op.effectId)}: ${op.key} ${op.value}`;
    case "setEffectEnabled":
      return `${track(op.trackId)} ${effect(op.trackId, op.effectId)}: ${op.enabled ? "on" : "bypassed"}`;
    case "setTimeSig":
      return `Time signature ${op.beats}/${op.unit}`;
    case "setAutomation": {
      const lane = `${AUTOMATION_RANGES[op.param].label.toLowerCase()} automation`;
      return `${track(op.trackId)}: ${lane}${op.points.length ? `, ${op.points.length} points` : " cleared"}`;
    }
    case "quantiseNotes":
      return `${pattern(op.patternId)}: quantised to ${op.grid ?? "1/16"}`;
  }
}
