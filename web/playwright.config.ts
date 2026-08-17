import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  use: { baseURL: "http://localhost:3777", viewport: { width: 1280, height: 900 } },
  webServer: {
    command: "pnpm exec next start -p 3777",
    port: 3777,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
