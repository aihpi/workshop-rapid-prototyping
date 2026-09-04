import { migrateSong } from "@hpi/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { runChat } from "../ai/chat.ts";
import { AiHttpError } from "../ai/client.ts";
import type { Complete } from "../ai/client.ts";

export type AiRouteOptions = { apiKey: string; models: string[]; defaultModel: string; complete?: Complete };

const chatBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).min(1).max(40),
  doc: z.unknown(),
  model: z.string().optional(),
});

/**
 * The key never leaves this process: the browser sends its document and the
 * conversation, the server talks to the gateway and returns validated ops.
 * Options rather than `config` so tests can run it unconfigured or with a fake model.
 */
export const aiRoutes: FastifyPluginAsync<AiRouteOptions> = async (app, opts) => {
  const configured = opts.apiKey.length > 0;

  app.get("/api/ai/models", async () => ({ configured, models: configured ? opts.models : [], default: opts.defaultModel }));

  app.post("/api/ai/chat", async (req, reply) => {
    if (!configured) return reply.code(503).send({ configured: false, error: "AI is not configured on the server" });
    const body = chatBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "bad request" });
    const model = body.data.model ?? opts.defaultModel;
    if (!opts.models.includes(model)) return reply.code(400).send({ error: `unknown model ${model}` });
    let doc;
    try {
      doc = migrateSong(body.data.doc);
    } catch {
      return reply.code(400).send({ error: "invalid song document" });
    }
    try {
      const outcome = await runChat(doc, body.data.messages, model, ...(opts.complete ? [opts.complete] : []));
      if (!outcome.ok) return reply.code(422).send({ error: "the model did not return usable changes", ...outcome });
      return outcome;
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") return reply.code(504).send({ error: "the model did not answer in time" });
      if (e instanceof AiHttpError) return reply.code(502).send({ error: e.message });
      throw e;
    }
  });
};
