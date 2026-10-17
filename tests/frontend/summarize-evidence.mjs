import fs from "node:fs";
import path from "node:path";
// Keep committed evidence free of auth payloads, traces and request bodies.
const input = process.argv[2];
if (!input)
  throw new Error(
    "Usage: node tests/frontend/summarize-evidence.mjs <Playwright results.json>",
  );
const report = JSON.parse(fs.readFileSync(input, "utf8"));
const cases = [];
function visit(suite) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests ?? []) {
      cases.push({
        suite: spec.file ?? suite.file,
        title: spec.title,
        browser: test.projectName,
        status: test.results.at(-1)?.status ?? "not-run",
        attempts: test.results.length,
      });
    }
  for (const child of suite.suites ?? []) visit(child);
}
report.suites.forEach(visit);
const bySuite = {};
for (const item of cases) {
  const key = `${item.suite}:${item.browser}`;
  const counts = (bySuite[key] ??= {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    other: 0,
  });
  counts.total++;
  if (["passed", "failed", "skipped"].includes(item.status))
    counts[item.status]++;
  else counts.other++;
}
console.log(
  JSON.stringify(
    {
      source: path.normalize(input),
      startTime: report.stats.startTime,
      durationMs: report.stats.duration,
      stats: report.stats,
      bySuite,
      retriedCases: cases.filter((item) => item.attempts > 1).length,
      limitations: [
        "Synthetic HTTP and actual production components; no real backend mutations.",
        "Client behaviour does not verify server RLS/Edge Functions or passkey security.",
        "Playwright WebKit and iPhone emulation are not physical iPhone Safari.",
        "Visual regression acceptance is recorded separately by the independent accessibility/design reviewer.",
      ],
    },
    null,
    2,
  ),
);
