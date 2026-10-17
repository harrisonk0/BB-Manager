import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.FRONTEND_PORT ?? "4192");
const origin = `http://127.0.0.1:${port}`;
const output = process.env.FRONTEND_OUTPUT_DIR ?? "test-results/frontend";
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  outputDir: fileURLToPath(new URL(`../../${output}`, import.meta.url)),
  timeout: 60_000,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: fileURLToPath(
          new URL(`../../${output}/results.json`, import.meta.url),
        ),
      },
    ],
  ],
  use: {
    serviceWorkers: "block", // HTTP fixtures cannot intercept a controlling worker's network.
    locale: "en-GB",
    timezoneId: "Europe/London",
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(process.env.FRONTEND_WEBKIT === "1"
      ? [
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"], launchOptions: {} },
          },
        ]
      : []),
  ],
  webServer: {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    command: `npx vite --config tests/frontend/vite.config.ts --host 127.0.0.1 --port ${port} --strictPort`,
    url: origin,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "synthetic-public-key-not-a-secret",
    },
    timeout: 120_000,
  },
});
