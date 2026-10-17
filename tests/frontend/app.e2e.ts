import { expect, test } from "@playwright/test";
import { installSyntheticBackend } from "./fixtures/backend";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-17T12:00:00Z"));
});
const widths = [320, 375, 390, 430, 768, 1024, 1440];
for (const width of widths) {
  test(`synthetic actual roster reflows at ${width}px`, async ({ page }) => {
    const fixture = await installSyntheticBackend(page);
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Alexander Montgomery-Worthington", { exact: true })
        .first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/frontend/roster-${test.info().project.name}-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });
}

test("100-member roster search runs actual components without external network", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page, { count: 100 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toBeVisible();
  const search = page
    .getByRole("searchbox")
    .or(page.getByLabel("Search members"));
  if (!(await search.isVisible()))
    await page.getByRole("button", { name: "Toggle search bar" }).click();
  await search.fill("Synthetic Member 100");
  await expect(
    page.getByText("Synthetic Member 100", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Alexander Montgomery-Worthington", { exact: true }),
  ).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

test("weekly marks use real save service and preserve decimal snapshot", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Marks", exact: true })
    .or(page.getByRole("link", { name: "Marks", exact: true }))
    .click();
  await expect(
    page.getByRole("heading", { name: "Weekly Marks", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Select weekly marks date").fill("2026-10-30");
  const confirm = page.getByRole("button", {
    name: "Change Date",
    exact: true,
  });
  if (await confirm.isVisible()) await confirm.click();
  await page
    .getByRole("button", {
      name: /Not recorded, Alexander Montgomery-Worthington.*Mark as present/,
    })
    .click();
  await page
    .getByLabel("Score /10 for Alexander Montgomery-Worthington", {
      exact: true,
    })
    .fill("7.5");
  await page.getByRole("button", { name: "Save Marks", exact: true }).click();
  await expect
    .poll(
      () =>
        fixture.requests.filter((item) =>
          item.path.endsWith("/save_weekly_marks_snapshot"),
        ).length,
    )
    .toBe(1);
  expect(
    fixture.marks.find(
      (mark) =>
        mark.member_id === fixture.members[0].id && mark.date === "2026-10-30",
    )?.score,
  ).toBe(7.5);
  expect(fixture.unexpected).toEqual([]);
});
