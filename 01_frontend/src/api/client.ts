import { migrateSong } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";

export type SongSummary = { id: string; title: string; bpm: number; rev: number; updatedAt: string };
export type UploadedSample = { id: string; name: string; url: string; bytes: number; durationSec: number };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json", ...(init?.headers ?? {}) }, ...init });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const json = (body: unknown): RequestInit => ({ headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** The whole API surface. One document in, one document out. */
export const api = {
  listSongs: () => request<SongSummary[]>("/api/songs"),

  async getSong(id: string): Promise<{ doc: SongDoc; rev: number }> {
    const res = await request<{ doc: unknown; rev: number }>(`/api/songs/${id}`);
    return { doc: migrateSong(res.doc), rev: res.rev };
  },

  createSong: (doc: SongDoc) => request<{ id: string; rev: number }>("/api/songs", { method: "POST", ...json({ doc }) }),

  saveSong: (doc: SongDoc, rev: number) => request<{ rev: number }>(`/api/songs/${doc.id}`, { method: "PUT", ...json({ doc, rev }) }),

  deleteSong: (id: string) => request<void>(`/api/songs/${id}`, { method: "DELETE" }),

  listSamples: () => request<UploadedSample[]>("/api/samples"),

  async uploadSample(wav: Blob, name: string, durationSec: number): Promise<UploadedSample> {
    const form = new FormData();
    form.append("name", name);
    form.append("durationSec", String(durationSec));
    form.append("file", wav, `${name}.wav`);
    const res = await fetch("/api/samples", { method: "POST", body: form });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return (await res.json()) as UploadedSample;
  },

  deleteSample: (id: string) => request<void>(`/api/samples/${id}`, { method: "DELETE" }),
};
