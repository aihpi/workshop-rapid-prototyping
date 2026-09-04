import { applyAiOps, newId } from "@hpi/shared";
import type { AiApplyResult, AiOp } from "@hpi/shared";

import { useSongStore, useUiStore } from "../state/index.ts";

/**
 * The one way AI output reaches the document: the whole batch inside a single
 * `apply`, so Ctrl+Z removes everything the assistant did in one step. The
 * document may have moved on since the server validated the ops, so they are
 * applied again here and this result, not the server's, is what the UI shows.
 */
export const aiActions = {
  applyOps(prompt: string, ops: AiOp[]): AiApplyResult {
    let result: AiApplyResult = { applied: [], rejected: [] };
    if (!ops.length) return result;
    const song = useSongStore.getState();
    song.apply(aiLabel(prompt), (d) => {
      result = applyAiOps(d, ops, newId);
    });
    useUiStore.getState().pruneAgainst(useSongStore.getState().doc);
    return result;
  },
};

export const aiLabel = (prompt: string): string => `AI: ${prompt.trim().slice(0, 48)}`;
