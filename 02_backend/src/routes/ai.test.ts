import { demoSong } from "@hpi/shared";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { aiRoutes } from "./ai.ts";

describe("ai routes", () => {
  it("reports itself unconfigured without a key and refuses to chat", async () => {
    const app = Fastify();
    await app.register(aiRoutes, { apiKey: "", models: ["m"], defaultModel: "m" });
    const models = await app.inject({ method: "GET", url: "/api/ai/models" });
    expect(models.json()).toEqual({ configured: false, models: [], default: "m" });
    const chat = await app.inject({ method: "POST", url: "/api/ai/chat", payload: { messages: [{ role: "user", content: "hi" }], doc: demoSong() } });
    expect(chat.statusCode).toBe(503);
    expect(chat.json()).toMatchObject({ configured: false });
  });

  it("validates the request and returns the model's ops", async () => {
    const app = Fastify();
    await app.register(aiRoutes, {
      apiKey: "k",
      models: ["m"],
      defaultModel: "m",
      complete: async () => ({ text: '{"message":"done","ops":[{"op":"setBpm","bpm":99}]}', usage: { prompt: 1, completion: 1 } }),
    });
    const bad = await app.inject({ method: "POST", url: "/api/ai/chat", payload: { messages: [], doc: demoSong() } });
    expect(bad.statusCode).toBe(400);
    const unknown = await app.inject({ method: "POST", url: "/api/ai/chat", payload: { messages: [{ role: "user", content: "x" }], doc: demoSong(), model: "other" } });
    expect(unknown.statusCode).toBe(400);
    const ok = await app.inject({ method: "POST", url: "/api/ai/chat", payload: { messages: [{ role: "user", content: "x" }], doc: demoSong() } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ ok: true, message: "done", ops: [{ op: "setBpm", bpm: 99 }], model: "m" });
  });
});
