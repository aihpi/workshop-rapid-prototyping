import { INSTRUMENT_LABELS, ticksPerBar } from "@hpi/shared";
import type { AiOp, SongDoc } from "@hpi/shared";

/** One human line per applied op, looked up against the document after the edit. */
export function describeOp(op: AiOp, doc: SongDoc): string {
  const track = (id: string) => doc.tracks[id]?.name ?? id;
  const pattern = (id: string) => doc.patterns[id]?.name ?? id;
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
  }
}
