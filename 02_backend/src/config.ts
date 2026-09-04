import path from "node:path";

// The root `.env` is optional and never overrides variables already set, so
// `npm run dev:api` picks up the AI key while docker compose passes it via env_file.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "../../.env"));
} catch {
  // no .env: the AI assistant reports itself as unconfigured
}

const csv = (v: string | undefined): string[] => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

// Every environment variable the API reads, in one place, with the defaults
// that match docker-compose.yml so `npm run dev:api` works against `docker compose up db`.
export const config = {
  port: Number(process.env["PORT"] ?? 3000),
  host: process.env["HOST"] ?? "0.0.0.0",
  databaseUrl: process.env["DATABASE_URL"] ?? "postgres://studio:studio@localhost:5432/studio",
  samplesDir: path.resolve(process.env["SAMPLES_DIR"] ?? "./data/samples"),
  /** OpenAI-compatible gateway. The AISC hub value from workshop-ragV2 works verbatim. */
  openaiApiKey: process.env["OPENAI_API_KEY"] ?? "",
  openaiApiBase: (process.env["OPENAI_API_BASE"] ?? "https://api.aisc.hpi.de").replace(/\/+$/, "").replace(/\/v1$/, ""),
  aiModels: csv(process.env["AI_MODELS"] ?? "gpt-oss-120b,llama-3-3-70b,gemma-4-31b"),
  aiDefaultModel: process.env["AI_DEFAULT_MODEL"] ?? "gpt-oss-120b",
  aiTimeoutMs: Number(process.env["AI_TIMEOUT_MS"] ?? 60_000),
};
