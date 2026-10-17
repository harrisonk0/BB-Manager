import { test, expect, type Page } from "@playwright/test";
import { installSyntheticBackend } from "./fixtures/backend";
async function passwordFields(page: Page) {
  const chooser = page.getByRole("button", {
    name: "I don’t have a passkey",
    exact: true,
  });
  if (await chooser.isVisible()) await chooser.click();
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
}

test("actual localhost password form authenticates through the real client and reload restores workspace", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page, { signedOut: true });
  await page.goto("/");
  await passwordFields(page);
  await page
    .getByLabel("Email address", { exact: true })
    .fill("synthetic@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your workspace", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Company/ }).click();
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toBeVisible();
  expect(
    fixture.requests.some((request) => request.path === "/auth/v1/token"),
  ).toBe(true);
  expect(fixture.unexpected).toEqual([]);
});

test("invalid synthetic password remains outside protected pages and recovery stays available", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page, { signedOut: true });
  await page.goto("/");
  await passwordFields(page);
  await page
    .getByLabel("Email address", { exact: true })
    .fill("synthetic@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByText("Synthetic credentials are invalid", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await expect
    .poll(() =>
      fixture.requests.some((request) => request.path === "/auth/v1/recover"),
    )
    .toBe(true);
  expect(fixture.unexpected).toEqual([]);
});
