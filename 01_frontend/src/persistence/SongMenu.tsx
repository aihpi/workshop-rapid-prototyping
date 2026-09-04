import { useEffect, useRef, useState } from "react";

import { useSongStore, useUiStore } from "../state/index.ts";
import { deleteSong, duplicateSong, newSong, openSong, renameSong, saveNow } from "./songs.ts";

const STATUS: Record<string, string> = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  offline: "Offline, changes are not being saved",
  conflict: "Saved elsewhere",
  error: "Could not save",
};

/** Title, save status and the song list, in the top bar. */
export function SongMenu() {
  const title = useSongStore((s) => s.doc.meta.title);
  const id = useSongStore((s) => s.doc.id);
  const saveState = useUiStore((s) => s.saveState);
  const list = useUiStore((s) => s.songList);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(title);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(title), [title]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="song-menu" ref={ref}>
      <input
        className="song-title"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && draft !== title && renameSong(draft.trim())}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label="Song title"
      />
      <button className="button ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Songs ▾
      </button>
      <span className={`save-state ${saveState}`} title={STATUS[saveState]}>
        {STATUS[saveState]}
        {saveState === "conflict" && (
          <button className="button small" onClick={() => void openSong(id)}>
            Reload
          </button>
        )}
        {saveState === "offline" && (
          <button className="button ghost small" onClick={() => void saveNow()}>
            Retry
          </button>
        )}
      </span>
      {open && (
        <div className="song-list" role="menu">
          <div className="song-list-actions">
            <button className="button ghost small" onClick={() => void newSong().then(() => setOpen(false))}>
              New
            </button>
            <button className="button ghost small" onClick={() => void duplicateSong().then(() => setOpen(false))}>
              Duplicate
            </button>
          </div>
          {list.length === 0 && <div className="muted small">No songs on the server.</div>}
          {list.map((s) => (
            <div key={s.id} className={`song-row ${s.id === id ? "current" : ""}`}>
              <button className="song-row-open" onClick={() => void openSong(s.id).then(() => setOpen(false))}>
                <span>{s.title}</span>
                <span className="muted small">{Math.round(s.bpm)} BPM</span>
              </button>
              <button
                className="chip"
                title="Delete"
                onClick={() => {
                  if (window.confirm(`Delete "${s.title}"?`)) void deleteSong(s.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
