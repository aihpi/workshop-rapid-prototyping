import { PPQ, ticksPerBar } from "@hpi/shared";
import { useEffect, useState } from "react";

import { engine, useSixteenth, withAudio } from "./audio/index.ts";
import { useSongStore, useUiStore } from "./state/index.ts";

type Health = { status: string; db: string };

export function App() {
  const doc = useSongStore((s) => s.doc);
  const { canUndo, canRedo, undoLabel, redoLabel, undo, redo } = useSongStore();
  const isPlaying = useUiStore((s) => s.isPlaying);
  const setPlaying = useUiStore((s) => s.setPlaying);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setHealth({ status: "unreachable", db: "unknown" }));
  }, []);

  const play = withAudio(() => {
    engine.play();
    setPlaying(true);
  });
  const stop = () => {
    engine.stop();
    setPlaying(false);
  };

  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="brand">HPI Studio</h1>
        <span className="muted">{doc.meta.title}</span>
        <div className="transport">
          <button className="button" onClick={isPlaying ? stop : play}>
            {isPlaying ? "Stop" : "Play"}
          </button>
          <Position />
          <span className="readout">{doc.meta.bpm} BPM</span>
        </div>
        <div className="history">
          <button className="button ghost" disabled={!canUndo} onClick={undo} title={undoLabel}>
            Undo
          </button>
          <button className="button ghost" disabled={!canRedo} onClick={redo} title={redoLabel}>
            Redo
          </button>
        </div>
        <span className="muted right">
          api {health?.status ?? "…"} · db {health?.db ?? "…"}
        </span>
      </header>
      <section className="panel muted">Timeline arrives in the next step. Press play to hear the scratch loop.</section>
    </main>
  );
}

/** bar:beat:sixteenth, re-rendering only when a sixteenth passes. */
function Position() {
  const sixteenth = useSixteenth();
  const doc = useSongStore((s) => s.doc);
  const perBar = ticksPerBar(doc.meta.timeSig) / (PPQ / 4);
  const perBeat = perBar / doc.meta.timeSig[0];
  const bar = Math.floor(sixteenth / perBar) + 1;
  const beat = Math.floor((sixteenth % perBar) / perBeat) + 1;
  const step = (sixteenth % perBeat) + 1;
  return (
    <span className="readout mono">
      {bar}:{beat}:{step}
    </span>
  );
}
