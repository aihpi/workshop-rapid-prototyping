// Runs the evaluation prompts against the gateway for a list of models and
// writes a comparison table. Usage, from the repo root with a `.env` in place:
//   npm run ai:eval -w 02_backend -- --models gpt-oss-120b,llama-3-3-70b --runs 2 --prompts 1,2,5
// Results land in tmp/ (gitignored). The key is read by config.ts and never printed.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { applyAiOps, demoSong, newId } from "@hpi/shared";

import { runChat } from "../src/ai/chat.ts";
import { config } from "../src/config.ts";
import { PROMPTS } from "./ai-eval-prompts.ts";

const { values } = parseArgs({
  options: {
    models: { type: "string", default: config.aiModels.join(",") },
    runs: { type: "string", default: "1" },
    prompts: { type: "string", default: PROMPTS.map((p) => p.id).join(",") },
  },
});
if (!config.openaiApiKey) {
  console.error("OPENAI_API_KEY is not set; copy .env.example to .env first");
  process.exit(1);
}
const models = values.models!.split(",").map((s) => s.trim()).filter(Boolean);
const runs = Number(values.runs);
const chosen = new Set(values.prompts!.split(",").map(Number));
const prompts = PROMPTS.filter((p) => chosen.has(p.id));

type Row = {
  model: string;
  prompt: number;
  run: number;
  json_ok: boolean;
  repaired: boolean;
  ops: number;
  rejected: number;
  semantic_ok: boolean;
  ms: number;
  prompt_tok: number;
  completion_tok: number;
  message: string;
  rejectedReasons: string[];
};

const rows: Row[] = [];
for (const model of models) {
  for (const prompt of prompts) {
    for (let run = 1; run <= runs; run++) {
      const before = demoSong();
      let row: Row;
      try {
        const out = await runChat(before, [{ role: "user", content: prompt.text }], model);
        if (out.ok) {
          const after = structuredClone(before);
          applyAiOps(after, out.ops, newId);
          let semantic = false;
          try {
            semantic = prompt.check(out, before, after);
          } catch {
            semantic = false;
          }
          row = {
            model,
            prompt: prompt.id,
            run,
            json_ok: true,
            repaired: out.repaired,
            ops: out.ops.length,
            rejected: out.rejected.length,
            semantic_ok: semantic,
            ms: out.latencyMs,
            prompt_tok: out.usage.prompt,
            completion_tok: out.usage.completion,
            message: out.message,
            rejectedReasons: out.rejected.map((r) => r.reason),
          };
        } else {
          row = { model, prompt: prompt.id, run, json_ok: false, repaired: true, ops: 0, rejected: 0, semantic_ok: false, ms: out.latencyMs, prompt_tok: out.usage.prompt, completion_tok: out.usage.completion, message: out.raw.slice(0, 200), rejectedReasons: out.reasons };
        }
      } catch (e) {
        row = { model, prompt: prompt.id, run, json_ok: false, repaired: false, ops: 0, rejected: 0, semantic_ok: false, ms: 0, prompt_tok: 0, completion_tok: 0, message: `ERROR ${(e as Error).message}`, rejectedReasons: [] };
      }
      rows.push(row);
      console.log(`${model.padEnd(16)} p${String(prompt.id).padStart(2)} r${run} json=${row.json_ok ? "y" : "n"} rep=${row.repaired ? "y" : "n"} ops=${String(row.ops).padStart(2)} rej=${row.rejected} ok=${row.semantic_ok ? "y" : "n"} ${String(row.ms).padStart(6)}ms  ${row.message.slice(0, 80).replace(/\n/g, " ")}`);
    }
  }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};
const pct = (n: number, d: number) => `${Math.round((100 * n) / Math.max(1, d))}%`;

const summary = models.map((model) => {
  const mine = rows.filter((r) => r.model === model);
  const valid = mine.filter((r) => r.json_ok && r.rejected === 0);
  return {
    model,
    runs: mine.length,
    valid: pct(valid.length, mine.length),
    repaired: pct(mine.filter((r) => r.repaired).length, mine.length),
    semantic_ok: `${mine.filter((r) => r.semantic_ok).length}/${mine.length}`,
    median_ms: median(mine.filter((r) => r.ms > 0).map((r) => r.ms)),
    median_completion_tok: median(mine.map((r) => r.completion_tok)),
  };
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve(import.meta.dirname, "../../tmp");
mkdirSync(outDir, { recursive: true });
const md = [
  `# AI eval ${stamp}`,
  "",
  "| model | runs | valid | repaired | semantic ok | median ms | median completion tokens |",
  "|---|---|---|---|---|---|---|",
  ...summary.map((s) => `| ${s.model} | ${s.runs} | ${s.valid} | ${s.repaired} | ${s.semantic_ok} | ${s.median_ms} | ${s.median_completion_tok} |`),
  "",
  "| model | prompt | run | json | repaired | ops | rejected | semantic | ms | message |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.model} | ${r.prompt} | ${r.run} | ${r.json_ok ? "y" : "n"} | ${r.repaired ? "y" : "n"} | ${r.ops} | ${r.rejected} | ${r.semantic_ok ? "y" : "n"} | ${r.ms} | ${r.message.replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 120)} |`),
  "",
].join("\n");
writeFileSync(path.join(outDir, `ai-eval-${stamp}.md`), md);
writeFileSync(path.join(outDir, `ai-eval-${stamp}.json`), JSON.stringify({ summary, rows }, null, 2));
console.table(summary);
console.log(`written to tmp/ai-eval-${stamp}.md`);
