import { test, expect, devices } from "@playwright/test";
import { installSyntheticBackend } from "./fixtures/backend";
const { defaultBrowserType: _, ...phone } = devices["iPhone 13"];
test.use(phone);
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-17T12:00:00Z"));
});
test("iPhone-emulated touch navigation and three-state attendance use native handlers", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Marks", exact: true }).tap();
  await expect(
    page.getByRole("heading", { name: "Weekly Marks", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Select weekly marks date").fill("2026-10-30");
  const name = "Alexander Montgomery-Worthington";
  let attendance = page.getByRole("button", {
    name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
  });
  await attendance.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await attendance.tap();
  attendance = page.getByRole("button", {
    name: new RegExp(`^Present, ${name}.*Mark as absent`),
  });
  await expect(attendance).toHaveText("Present");
  await attendance.tap();
  attendance = page.getByRole("button", {
    name: new RegExp(`^Absent, ${name}.*Clear attendance`),
  });
  await expect(attendance).toHaveText("Absent");
  await attendance.tap();
  await expect(
    page.getByRole("button", {
      name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
    }),
  ).toHaveText("Not recorded");
  await page
    .getByRole("button", {
      name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
    })
    .tap();
  await page.getByLabel(`Score /10 for ${name}`, { exact: true }).fill("9.25");
  await page.getByRole("button", { name: "Save Marks", exact: true }).tap();
  await expect
    .poll(
      () =>
        fixture.marks.find(
          (mark) =>
            mark.member_id === fixture.members[0].id &&
            mark.date === "2026-10-30",
        )?.score,
    )
    .toBe(9.25);
  expect(fixture.unexpected).toEqual([]);
});
test("iPhone-emulated editor switch has a real 44px input and touch synchronises React", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Add Boy", exact: true }).tap();
  const sheet = page.getByRole("dialog", { name: "Add member", exact: true });
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(650);
  const input = sheet.getByRole("checkbox", {
    name: "Set as Squad Leader",
    exact: true,
  });
  await input.scrollIntoViewIfNeeded();
  const box = await input.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + 2);
  await expect(input).toBeChecked();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + 2);
  await expect(input).not.toBeChecked();
  await sheet.getByRole("button", { name: "Close sheet", exact: true }).tap();
  await expect(sheet).not.toBeVisible();
  await page
    .getByRole("button", { name: "Open sort and filter options", exact: true })
    .tap();
  const filters = page.getByRole("dialog", {
    name: "Sort & filter",
    exact: true,
  });
  await expect(filters).toBeVisible();
  await filters.getByRole("button", { name: "Close sheet", exact: true }).tap();
  await expect(filters).not.toBeVisible();
  expect(fixture.unexpected).toEqual([]);
});

for (const leader of [false, true])
  test(`iPhone-emulated ${leader ? "leader" : "ordinary"} portal navigation uses touch without exposing other views`, async ({
    page,
  }) => {
    const fixture = await installSyntheticBackend(page, {
      role: "boy",
      leader,
    });
    await page.goto("/#!/portal/");
    await expect(
      page.getByRole("heading", { name: "My Company", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Calendar", exact: true }).tap();
    await expect(
      page
        .locator(".page-current")
        .getByRole("heading", { name: "Calendar", exact: true }),
    ).toBeVisible();
    if (leader) {
      await page.getByRole("link", { name: "My squad", exact: true }).tap();
      await expect(
        page
          .locator(".page-current")
          .getByRole("heading", { name: "My squad", exact: true }),
      ).toBeVisible();
    } else
      await expect(
        page.getByRole("link", { name: "My squad", exact: true }),
      ).toHaveCount(0);
    await page.getByRole("link", { name: "Account", exact: true }).tap();
    await expect(
      page
        .locator(".page-current")
        .getByRole("heading", { name: "Account", exact: true }),
    ).toBeVisible();
    expect(fixture.unexpected).toEqual([]);
  });

test("synthetic VisualViewport keyboard inset preserves Save and ignores pinch zoom", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), {
      height: 844,
      width: 390,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
  });
  const fixture = await installSyntheticBackend(page);
  await page.goto("/#!/weeklyMarks/");
  await page.getByLabel("Select weekly marks date").fill("2026-10-30");
  const name = "Alexander Montgomery-Worthington";
  await page.locator(".staff-attendance").last().click();
  const attendance = page.getByRole("button", {
    name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
  });
  await attendance.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await attendance.tap();
  await page.getByLabel(`Score /10 for ${name}`, { exact: true }).focus();
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 520, scale: 1 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-bb-keyboard-open",
    "",
  );
  await expect(page.locator(".bb-staff-tabs")).not.toBeVisible();
  const save = await page.locator(".bb-save-accessory").boundingBox();
  expect(save!.y + save!.height).toBeLessThanOrEqual(520);
  const lastInput = page.locator('input[aria-label^="Score /10 for"]').last();
  await lastInput.focus();
  await page.locator(".page-current .page-content").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const lastBox = await lastInput.boundingBox();
  expect(lastBox!.y).toBeGreaterThanOrEqual(0);
  expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(save!.y);
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 844, scale: 1 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-bb-keyboard-open",
    "",
  );
  await expect(page.locator(".bb-staff-tabs")).toBeVisible();
  await page.evaluate(() => {
    Object.assign(window.visualViewport!, { height: 520, scale: 2 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-bb-keyboard-open",
    "",
  );
  await expect(page.locator(".bb-staff-tabs")).toBeVisible();
  expect(fixture.unexpected).toEqual([]);
});
