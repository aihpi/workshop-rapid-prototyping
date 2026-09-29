import { PPQ, ticksPerBar } from "@hpi/shared";
import type { SongMeta } from "@hpi/shared";
import { useState } from "react";

import { useSixteenth } from "../audio/index.ts";
import { useSongStore, useUiStore } from "../state/index.ts";
import type { CountIn } from "../state/index.ts";
import { actions } from "../timeline/actions.ts";

const TIME_SIGS: readonly SongMeta["timeSig"][] = [
  [4, 4],
  [3, 4],
  [2, 4],
  [5, 4],
  [6, 8],
  [7, 8],
  [12, 8],
];

const sigKey = (sig: SongMeta["timeSig"]) => `${sig[0]}/${sig[1]}`;

/**
 * Play, record, loop, click, count-in, tempo, meter and position: one row.
 * Tempo and time signature are document edits; the rest is transport state.
 */
export function Transport() {
  const bpm = useSongStore((s) => s.doc.meta.bpm);
  const timeSig = useSongStore((s) => s.doc.meta.timeSig);
  const isPlaying = useUiStore((s) => s.isPlaying);
  const isRecording = useUiStore((s) => s.isRecording);
  const loop = useUiStore((s) => s.loop);
  const metronome = useUiStore((s) => s.metronome);
  const countInBars = useUiStore((s) => s.countInBars);

  return (
    <div className="transport">
      <button className="button" onClick={actions.togglePlay} title="Play / stop (Space)">
        {isPlaying ? "Stop" : "Play"}
      </button>
      <button className={`button record ${isRecording ? "on" : ""}`} aria-pressed={isRecording} onClick={actions.toggleRecord} title="Record live notes into the open pattern (R)">
        Record
      </button>
      <button
        className={`button ghost ${loop.enabled ? "active" : ""}`}
        aria-pressed={loop.enabled}
        data-loop-start={loop.startTick}
        data-loop-end={loop.endTick}
        onClick={actions.toggleLoop}
        title="Loop the marked region (L). Ctrl L marks the selection."
      >
        Loop
      </button>
      <button className={`button ghost ${metronome ? "active" : ""}`} aria-pressed={metronome} onClick={actions.toggleMetronome} title="Metronome click (M)">
        Click
      </button>
      <label className="toolbar-group" title="Bars of click before playback starts (C cycles)">
        <span className="muted small">Count-in</span>
        <select className="select" value={countInBars} onChange={(e) => actions.setCountIn(Number(e.target.value) as CountIn)} aria-label="Count-in">
          <option value={0}>Off</option>
          <option value={1}>1 bar</option>
          <option value={2}>2 bars</option>
        </select>
      </label>
      <TempoField bpm={bpm} />
      <select className="select mono" value={sigKey(timeSig)} onChange={(e) => actions.setTimeSig(TIME_SIGS.find((s) => sigKey(s) === e.target.value) ?? [4, 4])} aria-label="Time signature">
        {TIME_SIGS.map((sig) => (
          <option key={sigKey(sig)} value={sigKey(sig)}>
            {sigKey(sig)}
          </option>
        ))}
      </select>
      <Position />
    </div>
  );
}

/**
 * A draft while typing, one "Tempo" undo step on Enter or blur. Committing per
 * keystroke would clamp "1" to 20 before the "28" arrives.
 */
function TempoField({ bpm }: { bpm: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== "" && Number(draft) !== bpm) actions.setBpm(Number(draft));
    setDraft(null);
  };
  return (
    <label className="toolbar-group">
      <input
        className="number mono"
        type="number"
        min={20}
        max={300}
        step={1}
        value={draft ?? bpm}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(null);
        }}
        aria-label="Tempo"
      />
      <span className="muted small">bpm</span>
    </label>
  );
}

/** bar:beat:sixteenth, re-rendering only when a sixteenth passes. */
function Position() {
  const sixteenth = useSixteenth();
  const timeSig = useSongStore((s) => s.doc.meta.timeSig);
  const perBar = ticksPerBar(timeSig) / (PPQ / 4);
  const perBeat = perBar / timeSig[0];
  const bar = Math.floor(sixteenth / perBar) + 1;
  const beat = Math.floor((sixteenth % perBar) / perBeat) + 1;
  const step = (sixteenth % perBeat) + 1;
  return (
    <span className="readout mono">
      {bar}:{beat}:{step}
    </span>
  );
}
