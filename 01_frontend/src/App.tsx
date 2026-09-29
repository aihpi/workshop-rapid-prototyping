import { useEffect, useState } from "react";

import { AiDrawer } from "./ai/AiDrawer.tsx";
import { PatternEditor } from "./editors/EditorPane.tsx";
import { MidiStatus } from "./input/MidiStatus.tsx";
import { Mixer } from "./mixer/Mixer.tsx";
import { SoundPanel } from "./mixer/SoundPanel.tsx";
import { SongMenu } from "./persistence/SongMenu.tsx";
import { SamplesPanel } from "./samples/SamplesPanel.tsx";
import { useSongStore, useUiStore } from "./state/index.ts";
import type { PaneTab } from "./state/index.ts";
import { actions } from "./timeline/actions.ts";
import { Timeline } from "./timeline/Timeline.tsx";
import { PIANO_KEYS, SHORTCUTS } from "./timeline/useShortcuts.ts";
import { Transport } from "./transport/Transport.tsx";

type Health = { status: string; db: string };

export function App() {
  const { canUndo, canRedo, undoLabel, redoLabel, undo, redo } = useSongStore();
  const exporting = useUiStore((s) => s.exporting);
  const helpOpen = useUiStore((s) => s.helpOpen);
  const toggleHelp = useUiStore((s) => s.toggleHelp);
  const aiOpen = useUiStore((s) => s.aiOpen);
  const toggleAi = useUiStore((s) => s.toggleAi);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => setHealth({ status: "unreachable", db: "unknown" }));
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="brand">HPI Studio</h1>
        <SongMenu />
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
          <button className={`button ghost ${aiOpen ? "active" : ""}`} onClick={toggleAi} title="AI assistant (Ctrl K)">
            AI
          </button>
          <button className="button ghost" onClick={toggleHelp} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            ?
          </button>
        </div>
        <MidiStatus />
        <span className="muted right small" title="Backend status">
          api {health?.status ?? "…"} · db {health?.db ?? "…"}
        </span>
        <img className="partner-logo" src="/aisc-logo.png" alt="AI Service Centre Berlin-Brandenburg" />
      </header>
      <div className="transport-bar">
        <Transport />
      </div>
      <div className="body">
        <div className="workspace">
          <Timeline />
          <BottomPane />
        </div>
        <AiDrawer />
      </div>
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
            <h2>Keyboard piano</h2>
            <p className="muted small">Turn on Keyboard piano in the top bar. Notes play the sound panel's track and, while recording, land in the open pattern.</p>
            <dl className="shortcuts">
              {PIANO_KEYS.map(([keys, does]) => (
                <div key={keys}>
                  <dt>
                    <kbd>{keys}</kbd>
                  </dt>
                  <dd>{does}</dd>
                </div>
              ))}
            </dl>
            <p className="muted small">Double-click a lane to add a clip, a clip to edit it, a section name to rename it. Alt while dragging ignores snap.</p>
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
