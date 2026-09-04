import { ops, SCALES, ticksPerBar } from "@hpi/shared";
import type { ScaleName } from "@hpi/shared";

import { selectEditingPattern, useSongStore, useUiStore } from "../state/index.ts";
import { editorActions } from "./editorActions.ts";
import { PianoRoll } from "./PianoRoll.tsx";
import { StepGrid } from "./StepGrid.tsx";

const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Header and editor for the pattern behind the clip that was double-clicked. */
export function PatternEditor() {
  const editingClipId = useUiStore((s) => s.editingClipId);
  const clip = useSongStore((s) => (editingClipId ? s.doc.clips[editingClipId] : undefined));
  const pattern = useSongStore((s) => selectEditingPattern(s.doc, editingClipId));
  const track = useSongStore((s) => (clip ? s.doc.tracks[clip.trackId] : undefined));
  const placements = useSongStore((s) => (pattern ? ops.placementCount(s.doc, pattern.id) : 0));
  const tpb = useSongStore((s) => ticksPerBar(s.doc.meta.timeSig));
  const scaleRoot = useUiStore((s) => s.scaleRoot);
  const scaleName = useUiStore((s) => s.scaleName);
  const setScale = useUiStore((s) => s.setScale);

  if (!clip || !pattern || !track) {
    return <div className="pane-empty muted">Double-click a clip to edit its pattern, or double-click an empty lane to create one.</div>;
  }

  const bars = pattern.lengthTicks / tpb;

  return (
    <div className="pattern-editor">
      <header className="pane-header">
        <input
          className="pane-title"
          value={pattern.name}
          onChange={(e) => editorActions.renamePattern(pattern.id, e.target.value)}
          aria-label="Pattern name"
        />
        <label className="toolbar-group">
          <span className="muted small">Length</span>
          <select className="select" value={bars} onChange={(e) => editorActions.setPatternBars(pattern.id, Number(e.target.value))}>
            {[0.5, 1, 2, 4, 8].map((b) => (
              <option key={b} value={b}>
                {b} {b === 1 ? "bar" : "bars"}
              </option>
            ))}
          </select>
        </label>
        {pattern.kind === "pitched" && (
          <label className="toolbar-group">
            <span className="muted small">Scale</span>
            <select className="select" value={scaleRoot % 12} onChange={(e) => setScale(Number(e.target.value), scaleName)}>
              {ROOTS.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select className="select" value={scaleName} onChange={(e) => setScale(scaleRoot, e.target.value as ScaleName)}>
              {(Object.keys(SCALES) as ScaleName[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        {placements > 1 ? (
          <span className="linked-notice">
            ⧉ Shared by {placements} clips, edits change all of them.
            <button className="button ghost small" onClick={() => editorActions.makeUnique(clip.id)}>
              Make this one unique
            </button>
          </span>
        ) : (
          <span className="muted small">Only this clip uses this pattern.</span>
        )}
        <span className="muted small right">
          {track.name} · {pattern.notes.length} notes
        </span>
      </header>
      {pattern.kind === "drum" ? <StepGrid clip={clip} pattern={pattern} track={track} /> : <PianoRoll clip={clip} pattern={pattern} track={track} />}
    </div>
  );
}
