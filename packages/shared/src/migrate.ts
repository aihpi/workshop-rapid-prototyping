import { SongDocSchema } from "./song.ts";
import type { SongDoc } from "./song.ts";

// Every document that enters the app, whether from the API, a file import or
// localStorage, passes through here. Older schema versions are stepped forward
// one version at a time before the final parse, so a v3 client can still open a
// v1 song.
const steps: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
  // v2 gave every track an insert chain and automation lanes.
  1: (doc) => {
    const tracks = Object.fromEntries(
      Object.entries((doc["tracks"] ?? {}) as Record<string, Record<string, unknown>>).map(([id, track]) => [
        id,
        { ...track, effects: [], automation: {} },
      ]),
    );
    return { ...doc, schemaVersion: 2, tracks };
  },
};

export function migrateSong(raw: unknown): SongDoc {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("song document is not an object");
  }
  let doc = raw as Record<string, unknown>;
  let version = typeof doc["schemaVersion"] === "number" ? doc["schemaVersion"] : 0;
  while (version < SongDocSchema.shape.schemaVersion.value) {
    const step = steps[version];
    if (!step) throw new Error(`no migration from schema version ${version}`);
    doc = step(doc);
    version = doc["schemaVersion"] as number;
  }
  return SongDocSchema.parse(doc);
}
