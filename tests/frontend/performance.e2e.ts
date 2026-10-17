import { test, expect } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { installSyntheticBackend } from "./fixtures/backend";
for (const count of [30, 100])
  test(`${count}-member actual marks interaction samples`, async ({
    page,
    browser,
  }) => {
    await page.clock.setFixedTime(new Date("2026-10-17T12:00:00Z"));
    const fixture = await installSyntheticBackend(page, { count });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#!/weeklyMarks/");
    await page.getByLabel("Select weekly marks date").fill("2026-10-30");
    const buttons = page.locator(".staff-attendance");
    await expect(buttons).toHaveCount(count);
    const samples = await page.evaluate(async () => {
      const durations: number[] = [];
      for (let i = 0; i < 18; i++) {
        const start = performance.now();
        (
          document.querySelector(".staff-attendance") as HTMLButtonElement
        ).click();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => {
            if (i >= 3) durations.push(performance.now() - start);
            resolve();
          }),
        );
      }
      return durations;
    });
    const sorted = [...samples].sort((a, b) => a - b);
    const record = {
      browser: browser.version(),
      members: count,
      width: 390,
      samplesMs: samples,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      method:
        "Programmatic native click to next requestAnimationFrame; 3 warmup +15 samples. Cloud VM; not INP, physical-touch latency or iPhone benchmark.",
    };
    const directory =
      process.env.FRONTEND_OUTPUT_DIR ?? "test-results/frontend";
    await mkdir(directory, { recursive: true });
    await writeFile(
      `${directory}/performance-${test.info().project.name}-${count}.json`,
      JSON.stringify(record, null, 2),
    );
    expect(record.medianMs).toBeLessThan(500);
    expect(fixture.unexpected).toEqual([]);
  });
