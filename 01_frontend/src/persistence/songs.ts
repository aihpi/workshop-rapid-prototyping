import { demoSong, emptySong, makeTrack, newId, ops } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";

import { api, ApiError } from "../api/client.ts";
import { useSongStore, useUiStore } from "../state/index.ts";

/**
 * Opening, creating and saving songs. Autosave watches the store's `dirty`
 * flag, waits for a pause in editing, and sends the whole document with the
 * rev it was based on. A 409 means someone else saved first; nothing is
 * overwritten and the user is offered a reload.
 */
const song = () => useSongStore.getState();
const ui = () => useUiStore.getState();

const DEBOUNCE_MS = 1500;
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight = false;

export async function saveNow(): Promise<void> {
  if (inflight) return;
  const state = song();
  if (!state.dirty) return;
  if (ui().saveState === "conflict") return;
  const { doc, rev, editCount } = state;
  inflight = true;
  ui().setSaveState("saving");
  try {
    const res = await api.saveSong(doc, rev);
    state.markSaved(res.rev, editCount);
    ui().setSaveState(song().dirty ? "dirty" : "saved");
    if (song().dirty) schedule();
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) ui().setSaveState("conflict");
    else if (e instanceof ApiError && e.status === 404) {
      // The song was deleted on the server; recreate it rather than lose work.
      await api.createSong(doc).then((r) => state.markSaved(r.rev, editCount));
      ui().setSaveState("saved");
    } else ui().setSaveState("offline");
  } finally {
    inflight = false;
  }
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void saveNow(), DEBOUNCE_MS);
}

export function startAutosave(): () => void {
  const unsubscribe = useSongStore.subscribe(
    (s) => s.editCount,
    () => {
      if (!song().dirty) return;
      if (ui().saveState !== "conflict") ui().setSaveState("dirty");
      schedule();
    },
  );
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void saveNow();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => {
    unsubscribe();
    window.removeEventListener("keydown", onKey);
    if (timer) clearTimeout(timer);
  };
}

export async function openSong(id: string): Promise<void> {
  const { doc, rev } = await api.getSong(id);
  song().load(doc, rev);
  ui().clearSelection();
  ui().setEditingClip(null);
  ui().setSaveState("saved");
  await refreshSongList();
}

/** Fresh song with one drum track, created on the server first so it has a home. */
export async function newSong(): Promise<void> {
  const doc = emptySong(newId(), "Untitled");
  ops.addTrack(doc, makeTrack({ id: newId(), name: "Drums", kind: "drum", index: 0 }));
  await adopt(doc);
}

export async function duplicateSong(): Promise<void> {
  const current = song().doc;
  await adopt({ ...current, id: newId(), rev: 0, meta: { ...current.meta, title: `${current.meta.title} copy` } });
}

async function adopt(doc: SongDoc): Promise<void> {
  try {
    const res = await api.createSong(doc);
    song().load({ ...doc, rev: res.rev }, res.rev);
    ui().setSaveState("saved");
  } catch {
    song().load(doc, 0);
    ui().setSaveState("offline");
  }
  ui().clearSelection();
  ui().setEditingClip(null);
  await refreshSongList();
}

export async function deleteSong(id: string): Promise<void> {
  await api.deleteSong(id);
  const list = await refreshSongList();
  if (song().doc.id === id) {
    const next = list.find((s) => s.id !== id);
    if (next) await openSong(next.id);
    else await newSong();
  }
}

export function renameSong(title: string): void {
  song().apply("Rename song", (d) => ops.setTitle(d, title));
}

export async function refreshSongList() {
  try {
    const list = await api.listSongs();
    ui().setSongList(list);
    return list;
  } catch {
    return ui().songList;
  }
}

/** First load: the server's songs if it answers, the built-in demo if it does not. */
export async function bootstrap(): Promise<void> {
  try {
    const list = await api.listSongs();
    ui().setSongList(list);
    if (list[0]) await openSong(list[0].id);
    else await adopt(demoSong());
  } catch {
    song().load(demoSong(), 0);
    ui().setSaveState("offline");
  }
  startAutosave();
}
