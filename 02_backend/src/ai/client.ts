// One plain fetch against an OpenAI-compatible /v1/chat/completions. No SDK:
// the gateway's open models differ only in whether they accept JSON mode, and
// that is one retry. The `Complete` type is what `runChat` and the tests inject.

import { config } from "../config.ts";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Usage = { prompt: number; completion: number };
export type Completion = { text: string; usage: Usage };
export type Complete = (messages: ChatMessage[], model: string) => Promise<Completion>;

export class AiHttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`gateway ${status}: ${body.slice(0, 300)}`);
  }
}

/** Models that rejected `response_format`, remembered for the life of the process. */
const noJsonMode = new Set<string>();

export const complete: Complete = async (messages, model) => {
  const signal = AbortSignal.timeout(config.aiTimeoutMs);
  const base = { model, messages, temperature: 0.2 };
  const withJson = noJsonMode.has(model) ? base : { ...base, response_format: { type: "json_object" } };
  let res = await post(withJson, signal);
  if (res.status === 400 && !noJsonMode.has(model)) {
    const body = await res.text();
    if (!/response_format|json_object|json mode/i.test(body)) throw new AiHttpError(400, body);
    noJsonMode.add(model);
    res = await post(base, signal);
  }
  if (!res.ok) throw new AiHttpError(res.status, await res.text());
  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    usage: { prompt: json.usage?.prompt_tokens ?? 0, completion: json.usage?.completion_tokens ?? 0 },
  };
};

function post(body: unknown, signal: AbortSignal): Promise<Response> {
  return fetch(`${config.openaiApiBase}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.openaiApiKey}` },
    body: JSON.stringify(body),
    signal,
  });
}
