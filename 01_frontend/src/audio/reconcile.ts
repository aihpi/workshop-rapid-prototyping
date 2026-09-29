import type { Clip, Effect, Pattern, SongDoc, TimeSig, Track } from "@hpi/shared";

/**
 * What the reconciler needs from an engine. The real one wraps Tone; tests use
 * a recorder. Every method must tolerate being called before audio has started.
 */
export interface EngineLike {
  addTrack(track: Track, doc: SongDoc): void;
  removeTrack(trackId: string): void;
  setMix(track: Track): void;
  setInstrumentParams(track: Track): void;
  rebuildInstrument(track: Track, doc: SongDoc): void;
  rebuildEffects(track: Track): void;
  setEffectParams(track: Track, effect: Effect): void;
  setAutomation(track: Track): void;
  syncClip(clip: Clip, pattern: Pattern): void;
  removeClip(clipId: string): void;
  setBpm(bpm: number): void;
  setTimeSig(timeSig: TimeSig): void;
  setMasterVolume(db: number): void;
}

/** True when the chain must be rebuilt: something was added, removed, reordered or bypassed. */
export function effectsStructureChanged(before: readonly Effect[], after: readonly Effect[]): boolean {
  if (before.length !== after.length) return true;
  return before.some((b, i) => {
    const a = after[i]!;
    return b.id !== a.id || b.kind !== a.kind || b.enabled !== a.enabled;
  });
}

/**
 * Applies the difference between two immutable documents to the engine.
 *
 * There is no deep diff. Immer's structural sharing means anything unchanged is
 * the same object as before, so reference equality per entity is the whole
 * algorithm. Toggling one note produces a new `patterns` record and nothing
 * else, so every track is skipped in O(1) and only that pattern's placements
 * are rescheduled. Undo produces a document the same way and goes through the
 * same path.
 */
export function reconcile(prev: SongDoc | null, next: SongDoc, engine: EngineLike): void {
  if (prev === next) return;

  if (prev?.meta.bpm !== next.meta.bpm) engine.setBpm(next.meta.bpm);
  if (prev?.meta.timeSig !== next.meta.timeSig) engine.setTimeSig(next.meta.timeSig);
  if (prev?.meta.masterVolume !== next.meta.masterVolume) engine.setMasterVolume(next.meta.masterVolume);

  const samplesChanged = prev !== null && prev.samples !== next.samples;

  if (prev?.tracks !== next.tracks || prev?.trackOrder !== next.trackOrder || samplesChanged) {
    for (const id of next.trackOrder) {
      const before = prev?.tracks[id];
      const after = next.tracks[id];
      if (!after) continue;
      if (!before) {
        engine.addTrack(after, next);
        continue;
      }
      if (before === after && !samplesChanged) continue;

      const sampleMoved =
        samplesChanged &&
        after.instrument.sampleId !== undefined &&
        prev?.samples[after.instrument.sampleId] !== next.samples[after.instrument.sampleId];

      if (before.instrument.kind !== after.instrument.kind || before.instrument.sampleId !== after.instrument.sampleId || sampleMoved) {
        engine.rebuildInstrument(after, next);
      } else if (before.instrument.params !== after.instrument.params) {
        engine.setInstrumentParams(after);
      }
      if (before.mix !== after.mix) engine.setMix(after);
      if (before.effects !== after.effects) {
        if (effectsStructureChanged(before.effects, after.effects)) engine.rebuildEffects(after);
        else {
          after.effects.forEach((effect, i) => {
            if (before.effects[i] !== effect) engine.setEffectParams(after, effect);
          });
        }
      }
      if (before.automation !== after.automation) engine.setAutomation(after);
    }
    for (const id of Object.keys(prev?.tracks ?? {})) {
      if (!next.tracks[id]) engine.removeTrack(id);
    }
  }

  const dirtyPatterns = new Set<string>();
  if (prev?.patterns !== next.patterns) {
    for (const [id, pattern] of Object.entries(next.patterns)) {
      if (prev?.patterns[id] !== pattern) dirtyPatterns.add(id);
    }
  }

  if (prev?.clips !== next.clips || dirtyPatterns.size > 0) {
    for (const [id, clip] of Object.entries(next.clips)) {
      const before = prev?.clips[id];
      if (before === clip && !dirtyPatterns.has(clip.patternId)) continue;
      const pattern = next.patterns[clip.patternId];
      if (pattern) engine.syncClip(clip, pattern);
    }
    for (const id of Object.keys(prev?.clips ?? {})) {
      if (!next.clips[id]) engine.removeClip(id);
    }
  }
}
