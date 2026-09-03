// Every environment variable the API reads, in one place, with the defaults
// that match docker-compose.yml so `npm run dev:api` works against `docker compose up db`.
export const config = {
  port: Number(process.env["PORT"] ?? 3000),
  host: process.env["HOST"] ?? "0.0.0.0",
  databaseUrl: process.env["DATABASE_URL"] ?? "postgres://studio:studio@localhost:5432/studio",
  samplesDir: process.env["SAMPLES_DIR"] ?? "./data/samples",
};
