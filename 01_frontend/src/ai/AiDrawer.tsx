import type { AiOp } from "@hpi/shared";
import { useEffect, useRef, useState } from "react";

import { ApiError, api } from "../api/client.ts";
import type { AiModels, AiRejected } from "../api/client.ts";
import { useSongStore, useUiStore } from "../state/index.ts";
import { aiActions, aiLabel } from "./aiActions.ts";
import { describeOp } from "./describeOp.ts";

type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; applied: string[]; rejected: AiRejected[]; label: string | undefined; error: boolean };

const MODEL_KEY = "hpi-studio.aiModel";
const CONFIG_HINT = "AI is not configured. Copy .env.example to .env, set OPENAI_API_KEY and restart the API.";

/**
 * The conversation lives here, in component state, never in the document; the
 * drawer stays mounted while hidden so toggling it does not lose the thread.
 * Every reply is applied through `aiActions.applyOps`, so one Ctrl+Z undoes it.
 */
export function AiDrawer() {
  const open = useUiStore((s) => s.aiOpen);
  const toggle = useUiStore((s) => s.toggleAi);
  const undoLabel = useSongStore((s) => s.undoLabel);
  const undo = useSongStore((s) => s.undo);
  const [models, setModels] = useState<AiModels | "unreachable" | null>(null);
  const [model, setModel] = useState(() => localStorage.getItem(MODEL_KEY) ?? "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || models !== null) return;
    api
      .aiModels()
      .then((m) => {
        setModels(m);
        if (!m.models.includes(model)) setModel(m.default);
      })
      .catch(() => setModels("unreachable"));
  }, [open, models, model]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [turns, pending]);

  const configured = models !== null && models !== "unreachable" && models.configured;
  const canSend = configured && !pending && draft.trim().length > 0;

  async function send() {
    const prompt = draft.trim();
    if (!prompt || pending || !configured) return;
    const history = [...turns.map((t) => ({ role: t.role, content: t.content })), { role: "user" as const, content: prompt }];
    setTurns((t) => [...t, { role: "user", content: prompt }]);
    setDraft("");
    setPending(true);
    try {
      const before = useSongStore.getState().doc;
      const reply = await api.aiChat(history, before, model);
      const result = aiActions.applyOps(prompt, reply.ops);
      // Described once, here, with both documents to hand: a removed effect only has a name in `before`.
      const after = useSongStore.getState().doc;
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: reply.message || (result.applied.length ? "Done." : "Nothing to change."),
          applied: result.applied.map((op: AiOp) => describeOp(op, after, before)),
          rejected: [...reply.rejected, ...result.rejected],
          label: result.applied.length ? aiLabel(prompt) : undefined,
          error: false,
        },
      ]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: errorText(e), applied: [], rejected: [], label: undefined, error: true }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <aside className="ai-drawer" hidden={!open} aria-label="AI assistant">
      <div className="ai-head">
        <strong>Assistant</strong>
        {configured && (
          <select
            className="select"
            aria-label="Model"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              localStorage.setItem(MODEL_KEY, e.target.value);
            }}
          >
            {models.models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
        <button className="button ghost small" onClick={toggle} aria-label="Close assistant">
          ×
        </button>
      </div>
      <div className="ai-turns" ref={list}>
        {models === null && <p className="muted small">Connecting…</p>}
        {models !== null && !configured && <p className="ai-hint">{CONFIG_HINT}</p>}
        {configured && turns.length === 0 && (
          <p className="muted small">Try “make the drums deeper”, “more reverb on the keys and pan them left”, “write a four-bar outro beat”, or ask “what key is this song in?”.</p>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="ai-turn user">
              {t.content}
            </div>
          ) : (
            <div key={i} className={`ai-turn assistant ${t.error ? "error" : ""}`}>
              <p>{t.content}</p>
              {t.applied.length > 0 && (
                <details open>
                  <summary>
                    Applied {t.applied.length} {t.applied.length === 1 ? "change" : "changes"}
                    {t.label && undoLabel === t.label && (
                      <button className="link" onClick={undo}>
                        Undo
                      </button>
                    )}
                  </summary>
                  <ul>
                    {t.applied.map((line, j) => (
                      <li key={j}>{line}</li>
                    ))}
                  </ul>
                </details>
              )}
              {t.rejected.length > 0 && (
                <ul className="muted small ai-rejected">
                  {t.rejected.map((r, j) => (
                    <li key={j}>
                      Skipped {(r.op as { op?: string })?.op ?? "an op"}: {r.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
        {pending && <div className="ai-turn assistant muted">Asking {model}…</div>}
      </div>
      <form
        className="ai-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className="ai-input"
          aria-label="Message"
          rows={3}
          placeholder="Describe a change to the song…"
          value={draft}
          disabled={!configured || pending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button className="button" type="submit" disabled={!canSend} title="Send (Ctrl Enter)">
          Send
        </button>
      </form>
    </aside>
  );
}

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return CONFIG_HINT;
    if (e.status === 504) return "The model did not answer in time. Try again or pick another model.";
    if (e.status === 422) {
      const raw = (e.body as { raw?: string } | null)?.raw;
      return `The model's reply could not be used, so nothing was changed.${raw ? `\n\n${raw.slice(0, 400)}` : ""}`;
    }
    return `The API answered ${e.status}. Nothing was changed.`;
  }
  return "The API is unreachable. Nothing was changed.";
}
