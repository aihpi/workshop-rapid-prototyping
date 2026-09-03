import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the API runs on the host at :3000 and Postgres comes from
// `docker compose up db`. In production nginx does this proxying instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
    },
  },
});
