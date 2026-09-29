import { laneIsActive } from "@hpi/shared";
import type { Track } from "@hpi/shared";
import { memo } from "react";

import { INSTRUMENT_LABELS } from "../audio/index.ts";
import { useSongStore } from "../state/index.ts";
import { actions } from "../timeline/actions.ts";
import { swatchCss } from "../timeline/swatch.ts";
import { Fader } from "./Fader.tsx";
import { db, pan } from "./format.ts";
import { Meter } from "./Meter.tsx";
import { mixerActions } from "./mixerActions.ts";

/** One strip per track, master on the right. */
export function Mixer() {
  const trackOrder = useSongStore((s) => s.doc.trackOrder);
  const master = useSongStore((s) => s.doc.meta.masterVolume);
  return (
    <div className="mixer">
      {trackOrder.map((id) => (
        <Strip key={id} trackId={id} />
      ))}
      <div className="strip master">
        <div className="strip-name">Master</div>
        <span className="muted small">compressor · limiter</span>
        <div className="strip-fader">
          <Fader label="Master" value={master} min={-60} max={6} step={0.5} vertical format={db} onChange={mixerActions.setMasterVolume} />
          <Meter meterKey="master" />
        </div>
      </div>
    </div>
  );
}

const Strip = memo(function Strip({ trackId }: { trackId: string }) {
  const track = useSongStore((s) => s.doc.tracks[trackId]);
  if (!track) return null;
  return <StripView track={track} />;
});

function StripView({ track }: { track: Track }) {
  const id = track.id;
  return (
    <div className="strip" style={{ ["--track-colour" as string]: swatchCss(track.colour) }}>
      <div className="strip-swatch" />
      <div className="strip-name" title={track.name}>
        {track.name}
      </div>
      <span className="muted small">{INSTRUMENT_LABELS[track.instrument.kind]}</span>
      <Fader label="Pan" value={track.mix.pan} min={-1} max={1} step={0.02} format={pan} onChange={(v) => mixerActions.setPan(id, v)} />
      <Fader label="Reverb" value={track.mix.sends.reverb} min={0} max={1} step={0.01} onChange={(v) => mixerActions.setSend(id, "reverb", v)} />
      <Fader label="Delay" value={track.mix.sends.delay} min={0} max={1} step={0.01} onChange={(v) => mixerActions.setSend(id, "delay", v)} />
      <div className="strip-fader" title={laneIsActive(track.automation["volume"]) ? "Volume follows its automation lane" : undefined}>
        <Fader label="Volume" value={track.mix.volume} min={-60} max={6} step={0.5} vertical format={db} onChange={(v) => mixerActions.setVolume(id, v)} />
        <Meter meterKey={id} />
      </div>
      {laneIsActive(track.automation["volume"]) && <span className="muted small">automated</span>}
      <div className="track-buttons">
        <button className={`chip ${track.mix.mute ? "on" : ""}`} onClick={() => actions.toggleMute(id)} title="Mute">
          M
        </button>
        <button className={`chip ${track.mix.solo ? "on solo" : ""}`} onClick={() => actions.toggleSolo(id)} title="Solo">
          S
        </button>
      </div>
    </div>
  );
}
