import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Standalone demo, published under /strava-stats/app/ next to the owner's dashboard (see .github/workflows/pages.yml).
export default defineConfig({
  root: import.meta.dirname,
  base: "/strava-stats/app/",
  plugins: [react(), tailwindcss()],
  server: { port: 3104 },
  // owner/ build runs first and writes owner/dist; this adds owner/dist/app without wiping it
  build: { outDir: "../owner/dist/app", emptyOutDir: false },
});
