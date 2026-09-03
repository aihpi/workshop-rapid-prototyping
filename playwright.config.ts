import { defineConfig } from "@playwright/test";

// Runs against the Vite dev server with no API behind it, so the app falls
// back to the built-in demo song. That keeps the e2e independent of Postgres.
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? "github" : "list",
  use: {
    baseURL: "http://localhost:5199",
    viewport: { width: 1400, height: 900 },
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  },
  webServer: {
    command: "npm run dev -w 01_frontend -- --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
