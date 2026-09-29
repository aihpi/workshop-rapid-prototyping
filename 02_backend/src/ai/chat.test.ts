import { demoSong } from "@hpi/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runChat } from "./chat.ts";
import { complete } from "./client.ts";
import type { ChatMessage, Complete } from "./client.ts";

/** A model that answers from a script and records what it was asked. */
function scripted(replies: string[]): { complete: Complete; calls: ChatMessage[][] } {
  const calls: ChatMessage[][] = [];
  const complete: Complete = async (messages) => {
    calls.push(messages);
    return { text: replies[calls.length - 1] ?? "", usage: { prompt: 10, completion: 5 } };
  };
  return { complete, calls };
}

const ask = (text: string) => [{ role: "user" as const, content: text }];

describe("runChat", () => {
  it("returns the ops of a clean reply and sums usage", async () => {
    const m = scripted(['{"thoughts":"easy","message":"Set to 120.","ops":[{"op":"setBpm","bpm":120}]}']);
    const out = await runChat(demoSong(), ask("tempo 120"), "fake", m.complete);
    expect(out).toMatchObject({ ok: true, message: "Set to 120.", thoughts: "easy", ops: [{ op: "setBpm", bpm: 120 }], rejected: [], repaired: false, usage: { prompt: 10, completion: 5 } });
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0]![0]!.role).toBe("system");
    expect(m.calls[0]![0]!.content).toContain("drums-verse");
  });

  it("asks once more when an op is rejected, quoting the reason", async () => {
    const m = scripted([
      '{"message":"ok","ops":[{"op":"setMix","trackId":"basss","volume":0},{"op":"setBpm","bpm":110}]}',
      '{"message":"fixed","ops":[{"op":"setMix","trackId":"bass","volume":0},{"op":"setBpm","bpm":110}]}',
    ]);
    const out = await runChat(demoSong(), ask("louder bass"), "fake", m.complete);
    expect(out).toMatchObject({ ok: true, message: "fixed", repaired: true, rejected: [] });
    expect(out.ok && out.ops).toHaveLength(2);
    const repair = m.calls[1]!.at(-1)!.content;
    expect(repair).toContain('no track "basss"');
    expect(m.calls[1]!.at(-2)).toMatchObject({ role: "assistant" });
  });

  it("repairs a malformed op and keeps the leftovers visible", async () => {
    const m = scripted(['not json at all', '{"message":"second","ops":[{"op":"setBpm","bpm":100},{"op":"fly"}]}']);
    const out = await runChat(demoSong(), ask("x"), "fake", m.complete);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.ops).toEqual([{ op: "setBpm", bpm: 100 }]);
    expect(out.rejected).toHaveLength(1);
    expect(out.rejected[0]!.reason).toMatch(/op/);
    expect(m.calls[1]!.at(-1)!.content).toContain("no JSON object found");
  });

  it("gives up after two unusable replies with the raw text", async () => {
    const m = scripted(["nothing", "still nothing"]);
    const out = await runChat(demoSong(), ask("x"), "fake", m.complete);
    expect(out).toMatchObject({ ok: false, raw: "still nothing", usage: { prompt: 20, completion: 10 } });
  });

  it("treats a question answered with zero ops as a clean reply", async () => {
    const m = scripted(['{"message":"F minor.","ops":[]}']);
    const out = await runChat(demoSong(), ask("what key?"), "fake", m.complete);
    expect(out).toMatchObject({ ok: true, ops: [], repaired: false });
  });

  it("teaches the effect and automation ops and passes a setAutomation reply through", async () => {
    const lane = { op: "setAutomation", trackId: "keys", param: "volume", points: [{ bar: 0, value: -40 }, { bar: 2, value: -8 }] };
    const m = scripted([JSON.stringify({ message: "Fading the keys in.", ops: [lane] })]);
    const out = await runChat(demoSong(), ask("fade the keys in"), "fake", m.complete);
    const system = m.calls[0]![0]!.content;
    for (const name of ["addEffect", "removeEffect", "setEffectParam", "setEffectEnabled", "setTimeSig", "setAutomation", "quantiseNotes"]) expect(system).toContain(`"op":"${name}"`);
    expect(system).toContain("Effect parameters");
    expect(system).toContain("fx=[compressor:drums-comp");
    expect(out).toMatchObject({ ok: true, rejected: [], repaired: false });
    expect(out.ok && out.ops).toEqual([lane]);
  });
});

describe("complete", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("drops response_format for a model that rejects it and remembers", async () => {
    const bodies: string[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      if (bodies.length === 1) return new Response('{"error":"response_format is not supported"}', { status: 400 });
      return Response.json({ choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 1, completion_tokens: 2 } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const out = await complete([{ role: "user", content: "hi" }], "picky");
    expect(out).toEqual({ text: "{}", usage: { prompt: 1, completion: 2 } });
    expect(bodies[0]).toContain("json_object");
    expect(bodies[1]).not.toContain("json_object");
    await complete([{ role: "user", content: "again" }], "picky");
    expect(bodies).toHaveLength(3);
    expect(bodies[2]).not.toContain("json_object");
  });
});
