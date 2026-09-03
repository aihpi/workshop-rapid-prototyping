import { PPQ, ticksPerBar } from "@hpi/shared";
import { useEffect, useState } from "react";

import { engine, useSixteenth, withAudio } from "./audio/index.ts";
import { PatternEditor } from "./editors/EditorPane.tsx";
import { Mixer } from "./mixer/Mixer.tsx";
import { SongMenu } from "./persistence/SongMenu.tsx";
import { SamplesPanel } from "./samples/SamplesPanel.tsx";
import { SoundPanel } from "./mixer/SoundPanel.tsx";
import { useSongStore, useUiStore } from "./state/index.ts";
import type { PaneTab } from "./state/index.ts";
import { actions } from "./timeline/actions.ts";
import { Timeline } from "./timeline/Timeline.tsx";
import { SHORTCUTS } from "./timeline/useShortcuts.ts";

type Health = { status: string; db: string };

export function App() {
  const doc = useSongStore((s) => s.doc);
  const { canUndo, canRedo, undoLabel, redoLabel, undo, redo } = useSongStore();
  const isPlaying = useUiStore((s) => s.isPlaying);
  const setPlaying = useUiStore((s) => s.setPlaying);
  const exporting = useUiStore((s) => s.exporting);
  const helpOpen = useUiStore((s) => s.helpOpen);
  const toggleHelp = useUiStore((s) => s.toggleHelp);
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
        <SongMenu />
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
        <div className="history">
          <button className="button ghost" onClick={() => void actions.exportWav()} disabled={exporting} title="Render the whole song to a WAV file (Ctrl E)">
            Export WAV
          </button>
          <button className="button ghost" onClick={toggleHelp} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            ?
          </button>
        </div>
        <span className="muted right small" title="Backend status">
          api {health?.status ?? "…"} · db {health?.db ?? "…"}
        </span>
        <img className="partner-logo" src="/aisc-logo.png" alt="AI Service Centre Berlin-Brandenburg" />
      </header>
      <Timeline />
      <BottomPane />
      {exporting && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Rendering">
          <div className="modal">
            <div className="spinner" />
            <p>Rendering the song to WAV…</p>
            <p className="muted small">Faster than real time, but the page is busy until it finishes.</p>
          </div>
        </div>
      )}
      {helpOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={toggleHelp}>
          <div className="modal help" onClick={(e) => e.stopPropagation()}>
            <h2>Keyboard shortcuts</h2>
            <dl className="shortcuts">
              {SHORTCUTS.map(([keys, does]) => (
                <div key={keys}>
                  <dt>
                    <kbd>{keys}</kbd>
                  </dt>
                  <dd>{does}</dd>
                </div>
              ))}
            </dl>
            <p className="muted small">Double-click a lane to add a clip, a clip to edit it, a section band to rename it. Alt while dragging ignores snap.</p>
          </div>
        </div>
      )}
    </main>
  );
}

const TABS: { id: PaneTab; label: string }[] = [
  { id: "pattern", label: "Pattern" },
  { id: "sound", label: "Sound" },
  { id: "mixer", label: "Mixer" },
  { id: "samples", label: "Samples" },
];

function BottomPane() {
  const tab = useUiStore((s) => s.paneTab);
  const setTab = useUiStore((s) => s.setPaneTab);
  return (
    <section className="bottom-pane">
      <nav className="tabs" aria-label="Bottom pane">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="pane-body">
        {tab === "pattern" && <PatternEditor />}
        {tab === "sound" && <SoundPanel />}
        {tab === "mixer" && <Mixer />}
        {tab === "samples" && <SamplesPanel />}
      </div>
    </section>
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
