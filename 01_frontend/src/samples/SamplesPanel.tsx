import { useEffect, useRef, useState } from "react";

import { ensureAudio, envelope, preview, Recorder, silenceBounds } from "../audio/index.ts";
import { useSongStore } from "../state/index.ts";
import { cssVar } from "../timeline/swatch.ts";
import { importSample, removeSample, saveSample, shape, unreferencedServerSamples, useSampleOn } from "./sampleActions.ts";
import type { Capture, Shaping } from "./sampleActions.ts";

const recorder = new Recorder();

/**
 * Record, shape, save, and put samples on tracks. Recording state is local to
 * this panel; only the saved reference enters the song.
 */
export function SamplesPanel() {
  const [phase, setPhase] = useState<"idle" | "recording" | "captured" | "saving">("idle");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [shaping, setShaping] = useState<Shaping>({ startSec: 0, endSec: 0, normalised: true, reversed: false });
  const [name, setName] = useState("My sample");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (phase !== "recording") return;
    const t0 = Date.now();
    const id = setInterval(() => setSeconds((Date.now() - t0) / 1000), 100);
    return () => clearInterval(id);
  }, [phase]);

  const record = async () => {
    setError(null);
    try {
      await ensureAudio();
      await recorder.start();
      setPhase("recording");
    } catch (e) {
      setError(e instanceof Error && e.name === "NotAllowedError" ? "Microphone access was refused." : `Could not start recording: ${String(e)}`);
    }
  };

  const stop = async () => {
    try {
      const cap = await recorder.stop();
      const [start, end] = silenceBounds(cap.channels, cap.sampleRate);
      setCapture(cap);
      setShaping({ startSec: start, endSec: end, normalised: true, reversed: false });
      setPhase("captured");
    } catch (e) {
      setError(`Recording failed: ${String(e)}`);
      setPhase("idle");
    }
  };

  const save = async () => {
    if (!capture) return;
    setPhase("saving");
    await saveSample(capture, shaping, name);
    setPhase("idle");
    setCapture(null);
  };

  return (
    <div className="samples-panel">
      <section className="recorder">
        <div className="recorder-controls">
          {phase === "recording" ? (
            <button className="button record on" onClick={() => void stop()}>
              ■ Stop · {seconds.toFixed(1)} s
            </button>
          ) : (
            <button className="button record" onClick={() => void record()} disabled={phase === "saving"}>
              ● Record
            </button>
          )}
          {capture && phase === "captured" && (
            <>
              <button className="button ghost" onClick={() => preview(shape(capture, shaping), capture.sampleRate)}>
                ▶ Preview
              </button>
              <label className="toolbar-group">
                <input type="checkbox" checked={shaping.normalised} onChange={(e) => setShaping({ ...shaping, normalised: e.target.checked })} /> Normalise
              </label>
              <label className="toolbar-group">
                <input type="checkbox" checked={shaping.reversed} onChange={(e) => setShaping({ ...shaping, reversed: e.target.checked })} /> Reverse
              </label>
              <input className="pane-title" value={name} onChange={(e) => setName(e.target.value)} aria-label="Sample name" />
              <button className="button" onClick={() => void save()}>
                Save to library
              </button>
              <button className="button ghost" onClick={() => { setCapture(null); setPhase("idle"); }}>
                Discard
              </button>
            </>
          )}
          {error && <span className="linked-notice">{error}</span>}
          {phase === "idle" && !capture && !error && <span className="muted small">Record a one-shot from your microphone, trim it, and play it from any track.</span>}
        </div>
        {capture && <Waveform capture={capture} shaping={shaping} onChange={setShaping} />}
      </section>
      <Library />
    </div>
  );
}

function Waveform({ capture, shaping, onChange }: { capture: Capture; shaping: Shaping; onChange: (s: Shaping) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const width = 720;
  const height = 96;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cssVar("--bg-lanes");
    ctx.fillRect(0, 0, width, height);
    const env = envelope(capture.channels[0] ?? new Float32Array(), width);
    const x0 = (shaping.startSec / capture.durationSec) * width;
    const x1 = (shaping.endSec / capture.durationSec) * width;
    for (let x = 0; x < width; x++) {
      const h = Math.max(1, env[x]! * (height - 8));
      ctx.fillStyle = x >= x0 && x <= x1 ? cssVar("--accent") : cssVar("--grid-line-strong");
      ctx.fillRect(x, (height - h) / 2, 1, h);
    }
    ctx.fillStyle = cssVar("--hpi-orange");
    ctx.fillRect(Math.round(x0), 0, 2, height);
    ctx.fillRect(Math.round(x1) - 2, 0, 2, height);
  }, [capture, shaping]);

  return (
    <div className="waveform">
      <canvas ref={ref} style={{ width, height }} />
      <div className="trim-controls">
        <label className="fader">
          <span className="fader-label">Start</span>
          <input type="range" min={0} max={capture.durationSec} step={0.005} value={shaping.startSec} onChange={(e) => onChange({ ...shaping, startSec: Math.min(Number(e.target.value), shaping.endSec) })} />
          <span className="fader-value mono">{shaping.startSec.toFixed(2)} s</span>
        </label>
        <label className="fader">
          <span className="fader-label">End</span>
          <input type="range" min={0} max={capture.durationSec} step={0.005} value={shaping.endSec} onChange={(e) => onChange({ ...shaping, endSec: Math.max(Number(e.target.value), shaping.startSec) })} />
          <span className="fader-value mono">{shaping.endSec.toFixed(2)} s</span>
        </label>
      </div>
    </div>
  );
}

function Library() {
  const samples = useSongStore((s) => s.doc.samples);
  const tracks = useSongStore((s) => s.doc.tracks);
  const trackOrder = useSongStore((s) => s.doc.trackOrder);
  const [serverOnly, setServerOnly] = useState<{ id: string; name: string; url: string; durationSec: number }[]>([]);
  const ids = Object.keys(samples);

  useEffect(() => {
    void unreferencedServerSamples().then(setServerOnly);
  }, [ids.length]);

  return (
    <section className="library">
      <h3 className="library-title">
        Library <span className="muted small">{ids.length} in this song</span>
      </h3>
      {ids.length === 0 && serverOnly.length === 0 && <div className="muted small">Nothing yet. Record something above.</div>}
      {ids.map((id) => {
        const s = samples[id]!;
        const users = trackOrder.filter((t) => tracks[t]?.instrument.sampleId === id).map((t) => tracks[t]!.name);
        return (
          <div key={id} className="sample-row">
            <span className="sample-name">{s.name}</span>
            <span className="muted small">
              {s.durationSec.toFixed(2)} s{s.reversed ? " · reversed" : ""}
              {users.length ? ` · on ${users.join(", ")}` : ""}
            </span>
            <audio className="sample-audio" src={s.url} controls preload="none" />
            <select className="select" value="" onChange={(e) => e.target.value && useSampleOn(e.target.value, id)} aria-label="Use on track">
              <option value="">Use on track…</option>
              {trackOrder.map((t) => (
                <option key={t} value={t}>
                  {tracks[t]!.name}
                </option>
              ))}
            </select>
            <button className="chip" title="Remove from song" onClick={() => removeSample(id)}>
              ×
            </button>
          </div>
        );
      })}
      {serverOnly.length > 0 && (
        <>
          <h4 className="muted small">On the server, not in this song</h4>
          {serverOnly.map((s) => (
            <div key={s.id} className="sample-row">
              <span className="sample-name">{s.name}</span>
              <span className="muted small">{s.durationSec.toFixed(2)} s</span>
              <button className="button ghost small" onClick={() => importSample(s)}>
                Import
              </button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
