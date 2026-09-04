import { AiOpSchema, applyAiOps, newId } from "@hpi/shared";
import type { AiOp, SongDoc } from "@hpi/shared";
import { z } from "zod";

import { complete as defaultComplete } from "./client.ts";
import type { ChatMessage, Complete, Usage } from "./client.ts";
import { extractJson } from "./parse.ts";
import { buildMessages, repairMessage } from "./prompt.ts";
import type { HistoryMessage } from "./prompt.ts";

export type Rejected = { index: number; op: unknown; reason: string };

export type ChatOutcome =
  | { ok: true; message: string; thoughts?: string; ops: AiOp[]; rejected: Rejected[]; model: string; usage: Usage; latencyMs: number; repaired: boolean }
  | { ok: false; raw: string; reasons: string[]; model: string; usage: Usage; latencyMs: number };

// The envelope is parsed loosely so one malformed op costs that op, not the reply.
const Envelope = z.object({ thoughts: z.string().max(600).optional(), message: z.string().default(""), ops: z.array(z.unknown()).default([]) });

type Attempt = { ok: true; envelope: z.infer<typeof Envelope>; ops: AiOp[]; rejected: Rejected[] } | { ok: false; reasons: string[] };

/**
 * Parse, validate each op, dry-run the batch on a copy. Anything that fails
 * comes back as a reason the model can act on in the repair round.
 */
function attempt(doc: SongDoc, raw: string): Attempt {
  const json = extractJson(raw);
  if (!json) return { ok: false, reasons: ["no JSON object found in the reply"] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, reasons: [`invalid JSON: ${(e as Error).message}`] };
  }
  const env = Envelope.safeParse(parsed);
  if (!env.success) return { ok: false, reasons: env.error.issues.map((i) => `${i.path.join(".") || "reply"}: ${i.message}`) };

  const ops: AiOp[] = [];
  const rejected: Rejected[] = [];
  env.data.ops.forEach((op, index) => {
    const r = AiOpSchema.safeParse(op);
    if (r.success) ops.push(r.data);
    else rejected.push({ index, op, reason: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  });
  const dry = applyAiOps(structuredClone(doc), ops, newId);
  for (const r of dry.rejected) rejected.push({ index: r.index, op: r.op, reason: r.reason });
  return { ok: true, envelope: env.data, ops: dry.applied, rejected };
}

const describe = (r: Rejected) => `op ${r.index} ${JSON.stringify(r.op).slice(0, 160)}: ${r.reason}`;

/**
 * One model call, one optional repair call quoting what went wrong. The ops
 * returned are the ones that applied cleanly to a copy of the document; the
 * client applies them again to the live one as a single undo step.
 */
export async function runChat(doc: SongDoc, history: HistoryMessage[], model: string, complete: Complete = defaultComplete): Promise<ChatOutcome> {
  const started = Date.now();
  const usage: Usage = { prompt: 0, completion: 0 };
  const messages: ChatMessage[] = buildMessages(doc, history);

  const first = await complete(messages, model);
  usage.prompt += first.usage.prompt;
  usage.completion += first.usage.completion;
  let result = attempt(doc, first.text);
  if (result.ok && result.rejected.length === 0) return done(result, first.text, false);

  const problems = result.ok ? result.rejected.map(describe) : result.reasons;
  const second = await complete([...messages, { role: "assistant", content: first.text }, { role: "user", content: repairMessage(problems) }], model);
  usage.prompt += second.usage.prompt;
  usage.completion += second.usage.completion;
  const repaired = attempt(doc, second.text);
  // A repair that parses is taken even with leftovers; one that does not falls
  // back to the first attempt if that at least parsed.
  if (repaired.ok) result = repaired;
  if (!result.ok) return { ok: false, raw: second.text, reasons: repaired.ok ? [] : repaired.reasons, model, usage, latencyMs: Date.now() - started };
  return done(result, repaired.ok ? second.text : first.text, true);

  function done(r: Attempt & { ok: true }, _raw: string, wasRepaired: boolean): ChatOutcome {
    return {
      ok: true,
      message: r.envelope.message,
      ...(r.envelope.thoughts !== undefined ? { thoughts: r.envelope.thoughts } : {}),
      ops: r.ops,
      rejected: r.rejected,
      model,
      usage,
      latencyMs: Date.now() - started,
      repaired: wasRepaired,
    };
  }
}
