import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const workflow = readFileSync(
  ".github/workflows/ci-infrastructure.yml",
  "utf8",
);
const code = workflow.match(
  /node --input-type=module <<'NODE'\n([\s\S]*?)\n\s*NODE/,
)?.[1];
const safe = {
  PATH: process.env.PATH,
  VITE_SUPABASE_URL: "https://synthetic-staging.supabase.co",
  VITE_SUPABASE_ANON_KEY: "synthetic-only",
  E2E_TEST_EMAIL: "synthetic@example.invalid",
  E2E_TEST_PASSWORD: "synthetic-only",
  ALLOWED_STAGING_URL: "https://synthetic-staging.supabase.co",
  PRODUCTION_SUPABASE_URL: "https://synthetic-production.supabase.co",
};
describe("independent staging CI preflight", { timeout: 20_000 }, () => {
  it("contains a reviewable preflight before authenticated operations", () => {
    expect(code).toBeTruthy();
    expect(workflow.indexOf("node --input-type=module <<'NODE'")).toBeLessThan(
      workflow.indexOf("npm run check:auth-config"),
    );
  });
  it("accepts only the explicitly allowlisted distinct HTTPS staging origin", () => {
    const result = spawnSync(process.execPath, ["--input-type=module"], {
      input: code,
      encoding: "utf8",
      env: safe,
    });
    expect(result.status).toBe(0);
  });
  it.each([
    {
      VITE_SUPABASE_URL: "https://synthetic-production.supabase.co",
      ALLOWED_STAGING_URL: "https://synthetic-production.supabase.co",
    },
    { VITE_SUPABASE_URL: "https://unlisted.supabase.co" },
    { E2E_TEST_PASSWORD: "" },
    { PRODUCTION_SUPABASE_URL: "" },
    { VITE_SUPABASE_URL: "http://synthetic-staging.supabase.co" },
    {
      VITE_SUPABASE_URL: "https://user:password@synthetic-staging.supabase.co",
    },
    { VITE_SUPABASE_URL: "https://synthetic-staging.supabase.co/path" },
    {
      VITE_SUPABASE_URL:
        "https://synthetic-staging.supabase.co/?token=synthetic",
    },
    { VITE_SUPABASE_URL: "https://synthetic-staging.supabase.co/#synthetic" },
  ])("rejects unsafe/missing configuration without network %#", (override) => {
    const result = spawnSync(process.execPath, ["--input-type=module"], {
      input: code,
      encoding: "utf8",
      env: { ...safe, ...override },
    });
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain("accepted");
  });
});
