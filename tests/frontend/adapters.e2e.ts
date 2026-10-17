import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/tests/frontend/adapter.html");
  await expect(page.getByRole("heading", { name: "Adapter acceptance" }))
    .toBeVisible()
    .catch(async (error) => {
      console.error(
        "Adapter load diagnostics",
        JSON.stringify({
          errors,
          body: await page.locator("body").innerHTML(),
        }),
      );
      throw error;
    });
});
test("Framework7 disabled adapter prevents native and programmatic activation", async ({
  page,
}) => {
  const action = page.getByRole("button", { name: "Guarded action" });
  await expect(action).toBeDisabled();
  await action.evaluate((el: HTMLButtonElement) => el.click());
  await expect(page.getByLabel("Activation count")).toHaveText("0");
  await page.getByRole("button", { name: "Toggle disabled" }).click();
  await expect(action).toBeEnabled();
  await action.click();
  await expect(page.getByLabel("Activation count")).toHaveText("1");
});
test("Framework7 switch synchronises keyboard and external React updates", async ({
  page,
}) => {
  const input = page.getByRole("checkbox", { name: "Enable notifications" });
  await expect(input).not.toBeChecked();
  await input.focus();
  await page.keyboard.press("Space");
  await expect(input).toBeChecked();
  await expect(page.getByLabel("Switch state")).toHaveText("true");
  await page.getByRole("button", { name: "External switch update" }).click();
  await expect(input).not.toBeChecked();
  await input.focus();
  await page.keyboard.press("Space");
  await expect(input).toBeChecked();
});
test("Framework7 sheet traps focus, isolates background and restores trigger", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Open task" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Acceptance task" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("inert", "");
  await dialog.getByRole("button", { name: "Last task action" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close sheet" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Last task action" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator("main")).not.toHaveAttribute("inert", "");
  await expect(page.getByRole("button", { name: "Close sheet" })).toHaveCount(
    0,
  );
});
test("Framework7 search retains native accessible name after edits", async ({
  page,
}) => {
  const input = page.getByRole("searchbox", { name: "Search fixtures" });
  await input.fill("Alexander");
  await expect(page.getByLabel("Search value")).toHaveText("Alexander");
  await input.fill("Junior");
  await expect(input).toHaveValue("Junior");
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("busy sheet rejects close button, Escape and backdrop dismissal", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open task" }).click();
  await page.waitForTimeout(650); // Complete native sheet entry before changing dismissal policy.
  const dialog = page.getByRole("dialog", { name: "Acceptance task" });
  await dialog.getByRole("button", { name: "Start mutation" }).click();
  await expect(
    dialog.getByRole("button", { name: "Close sheet" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page
    .locator(".sheet-backdrop.backdrop-in")
    .click({ position: { x: 5, y: 5 }, force: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Finish mutation" }).click();
  await dialog.getByRole("button", { name: "Close sheet" }).click();
  await expect(dialog).not.toBeVisible();
});

test("initially busy sheet becomes dismissible after recovery", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open busy task" }).click();
  const dialog = page.getByRole("dialog", { name: "Acceptance task" });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(650);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Finish mutation" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("initially open lazy sheet has dialog semantics and repeated destruction leaves no stale touch handler", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Mount open sheet", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Mounted open task" });
    await expect(dialog).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("inert", "");
    await page.waitForTimeout(650);
    await dialog.getByRole("button", { name: "Close sheet" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Background action" }).click();
  }
  expect(errors).toEqual([]);
});

test("shared field errors and hints reference their controls", async ({
  page,
}) => {
  const choice = page.getByLabel("Recovery choice", { exact: true });
  await expect(choice).toHaveAttribute("aria-invalid", "true");
  const description = await choice.getAttribute("aria-describedby");
  expect(description).toBeTruthy();
  await expect(page.locator(`[id="${description}"]`)).toHaveText(
    "Choose a recovery option",
  );
  const reference = page.getByLabel("Reference", { exact: true });
  const hint = await reference.getAttribute("aria-describedby");
  expect(hint).toBeTruthy();
  await expect(page.locator(`[id="${hint}"]`)).toHaveText(
    "Use a synthetic roster reference",
  );
});

test("SVG sheet trigger restores focus, removed trigger falls back to main", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Open icon task" });
  await trigger.locator("svg circle").click();
  let dialog = page.getByRole("dialog", { name: "Acceptance task" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close sheet" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Open and remove trigger" }).click();
  dialog = page.getByRole("dialog", { name: "Acceptance task" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close sheet" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("main")).toBeFocused();
});
