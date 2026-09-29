import type { InstrumentKind } from "@hpi/shared";

import { INSTRUMENT_LABELS, INSTRUMENT_SPECS, paramValue } from "../audio/index.ts";
import { selectSoundTrackId, useSongStore, useUiStore } from "../state/index.ts";
import { swatchCss } from "../timeline/swatch.ts";
import { DeviceChain } from "./DeviceChain.tsx";
import { Fader } from "./Fader.tsx";
import { mixerActions } from "./mixerActions.ts";

const KINDS: InstrumentKind[] = ["kit", "pluck", "fm", "poly", "sampler"];

/**
 * Instrument and its parameters for one track, driven entirely by
 * INSTRUMENT_SPECS so a new synth needs no UI code. Follows the clip being
 * edited; otherwise whichever track was chosen here.
 */
export function SoundPanel() {
  const trackOrder = useSongStore((s) => s.doc.trackOrder);
  const editingClipId = useUiStore((s) => s.editingClipId);
  const editingTrackId = useSongStore((s) => (editingClipId ? s.doc.clips[editingClipId]?.trackId : undefined));
  const chosen = useUiStore((s) => s.soundTrackId);
  const setChosen = useUiStore((s) => s.setSoundTrack);
  const trackId = useSongStore((s) => selectSoundTrackId(s.doc, { editingClipId, soundTrackId: chosen }));
  const track = useSongStore((s) => (trackId ? s.doc.tracks[trackId] : undefined));
  const samples = useSongStore((s) => s.doc.samples);

  if (!track) return <div className="pane-empty muted">Add a track to shape its sound.</div>;

  const specs = INSTRUMENT_SPECS[track.instrument.kind];
  const sampleIds = Object.keys(samples);
  const kinds = track.kind === "drum" ? KINDS : KINDS.filter((k) => k !== "kit");

  return (
    <div className="sound-panel" style={{ ["--track-colour" as string]: swatchCss(track.colour) }}>
      <header className="pane-header">
        <div className="strip-swatch inline" />
        <select className="select" value={track.id} onChange={(e) => setChosen(e.target.value)} aria-label="Track">
          {trackOrder.map((id) => (
            <TrackOption key={id} id={id} />
          ))}
        </select>
        <label className="toolbar-group">
          <span className="muted small">Instrument</span>
          <select
            className="select"
            value={track.instrument.kind}
            onChange={(e) => mixerActions.setInstrumentKind(track.id, e.target.value as InstrumentKind, e.target.value === "sampler" ? sampleIds[0] : undefined)}
          >
            {kinds.map((k) => (
              <option key={k} value={k} disabled={k === "sampler" && sampleIds.length === 0}>
                {INSTRUMENT_LABELS[k]}
                {k === "sampler" && sampleIds.length === 0 ? " (record one first)" : ""}
              </option>
            ))}
          </select>
        </label>
        {track.instrument.kind === "sampler" && (
          <label className="toolbar-group">
            <span className="muted small">Sample</span>
            <select
              className="select"
              value={track.instrument.sampleId ?? ""}
              onChange={(e) => mixerActions.setInstrumentKind(track.id, "sampler", e.target.value)}
            >
              {sampleIds.map((id) => (
                <option key={id} value={id}>
                  {samples[id]!.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {editingTrackId && <span className="muted small right">Following the clip being edited</span>}
      </header>
      <div className="params">
        {specs.map((spec) => (
          <Fader
            key={spec.key}
            label={spec.label}
            value={paramValue(track.instrument, spec.key)}
            min={spec.min}
            max={spec.max}
            {...(spec.step !== undefined ? { step: spec.step } : {})}
            {...(spec.unit !== undefined ? { unit: spec.unit } : {})}
            onChange={(v) => mixerActions.setParam(track.id, spec.key, v)}
          />
        ))}
        {specs.length === 0 && <span className="muted">This instrument has no parameters.</span>}
      </div>
      <DeviceChain track={track} />
    </div>
  );
}

function TrackOption({ id }: { id: string }) {
  const name = useSongStore((s) => s.doc.tracks[id]?.name ?? id);
  return <option value={id}>{name}</option>;
}
