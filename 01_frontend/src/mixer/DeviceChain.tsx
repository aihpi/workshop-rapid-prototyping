import { EFFECT_KINDS, EFFECT_LABELS, EFFECT_SPECS, effectParamValue, isChoiceSpec } from "@hpi/shared";
import type { Effect, EffectKind, Track } from "@hpi/shared";

import { Fader } from "./Fader.tsx";
import { mixerActions } from "./mixerActions.ts";

/**
 * The insert chain of one track, in signal order left to right. Driven by
 * EFFECT_SPECS the way the sound panel is driven by INSTRUMENT_SPECS, so a
 * new effect kind needs no UI code.
 */
export function DeviceChain({ track }: { track: Track }) {
  return (
    <div className="devices">
      <div className="devices-head">
        <span className="muted small">Effects</span>
        <select
          className="select"
          value=""
          onChange={(e) => {
            if (e.target.value) mixerActions.addEffect(track.id, e.target.value as EffectKind);
          }}
          aria-label="Add effect"
        >
          <option value="">Add effect…</option>
          {EFFECT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {EFFECT_LABELS[kind]}
            </option>
          ))}
        </select>
        {track.effects.length === 0 && <span className="muted small">None yet. The instrument goes straight to the channel.</span>}
      </div>
      {track.effects.length > 0 && (
        <div className="device-list">
          {track.effects.map((effect, i) => (
            <Device key={effect.id} trackId={track.id} effect={effect} index={i} count={track.effects.length} />
          ))}
        </div>
      )}
    </div>
  );
}

function Device({ trackId, effect, index, count }: { trackId: string; effect: Effect; index: number; count: number }) {
  const label = EFFECT_LABELS[effect.kind];
  return (
    <div className={`device ${effect.enabled ? "" : "off"}`}>
      <div className="device-head">
        <span className="device-name">{label}</span>
        <button
          className={`chip ${effect.enabled ? "on" : ""}`}
          aria-pressed={effect.enabled}
          onClick={() => mixerActions.setEffectEnabled(trackId, effect.id, !effect.enabled, label)}
          title={effect.enabled ? `Bypass ${label}` : `Enable ${label}`}
        >
          {effect.enabled ? "On" : "Off"}
        </button>
        <button className="chip" disabled={index === 0} onClick={() => mixerActions.moveEffect(trackId, effect.id, index - 1)} aria-label={`Move ${label} earlier`} title="Earlier in the chain">
          ←
        </button>
        <button className="chip" disabled={index === count - 1} onClick={() => mixerActions.moveEffect(trackId, effect.id, index + 1)} aria-label={`Move ${label} later`} title="Later in the chain">
          →
        </button>
        <button className="chip" onClick={() => mixerActions.removeEffect(trackId, effect.id, label)} aria-label={`Remove ${label}`} title="Remove">
          ×
        </button>
      </div>
      {EFFECT_SPECS[effect.kind].map((spec) =>
        isChoiceSpec(spec) ? (
          <label key={spec.key} className="fader">
            <span className="fader-label">{spec.label}</span>
            <select className="select" value={effectParamValue(effect, spec.key) as string} onChange={(e) => mixerActions.setEffectParam(trackId, effect.id, spec.key, e.target.value)} aria-label={spec.label}>
              {spec.choices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <Fader
            key={spec.key}
            label={spec.label}
            value={effectParamValue(effect, spec.key) as number}
            min={spec.min}
            max={spec.max}
            {...(spec.step !== undefined ? { step: spec.step } : {})}
            {...(spec.unit !== undefined ? { unit: spec.unit } : {})}
            onChange={(v) => mixerActions.setEffectParam(trackId, effect.id, spec.key, v)}
          />
        ),
      )}
    </div>
  );
}
