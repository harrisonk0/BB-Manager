import { test, expect, type Page } from "@playwright/test";
import { installSyntheticBackend } from "./fixtures/backend";
async function switchSection(
  page: Page,
  section: "company" | "junior" = "junior",
  dirty = false,
) {
  await page
    .getByRole("button", { name: "Workspace and account", exact: true })
    .click();
  const workspace = page.getByRole("dialog", {
    name: "Workspace",
    exact: true,
  });
  await expect(workspace).toBeVisible();
  await page.waitForTimeout(650);
  await workspace
    .getByRole("button", { name: "Switch section", exact: true })
    .click();
  if (dirty)
    await page
      .getByRole("dialog", { name: "Unsaved Changes", exact: true })
      .getByRole("button", { name: "Leave", exact: true })
      .click();
  await expect(page.locator(".sheet-modal.modal-in")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/with-modal/);
  await page
    .getByRole("button", {
      name:
        section === "company"
          ? "Manage Company Section"
          : "Manage Junior Section",
      exact: true,
    })
    .click();
}

for (const returnToCompany of [false, true])
  test(`delayed Company settings callback cannot overwrite ${returnToCompany ? "a newly entered Company scope (ABA)" : "current Junior settings"}`, async ({
    page,
  }) => {
    const fixture = await installSyntheticBackend(page);
    let waiting = false;
    let release: () => void = () => {};
    await page.route("**/rest/v1/settings?**", async (route) => {
      if (route.request().method() === "PATCH") {
        waiting = true;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      await route.fallback();
    });
    await page.goto("/#!/settings/");
    await page.getByLabel("Meeting day", { exact: true }).selectOption("6");
    await page
      .getByRole("button", { name: "Save meeting day", exact: true })
      .click();
    await expect.poll(() => waiting).toBe(true);
    await switchSection(page);
    if (returnToCompany) await switchSection(page, "company");
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByLabel("Meeting day", { exact: true })).toHaveValue(
      "5",
    );
    release();
    await expect
      .poll(
        () =>
          fixture.requests.filter(
            (request) =>
              request.path === "/rest/v1/settings" &&
              request.method === "PATCH",
          ).length,
      )
      .toBe(1);
    await page.waitForTimeout(300);
    await expect(page.getByLabel("Meeting day", { exact: true })).toHaveValue(
      "5",
    );
    expect(fixture.unexpected).toEqual([]);
  });

test("old member-save refresh cannot cancel a newer Junior load", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  let saveWaiting = false;
  let juniorWaiting = false;
  let releaseSave: () => void = () => {};
  let releaseJunior: () => void = () => {};
  await page.route("**/rest/v1/rpc/save_member_marks_patch", async (route) => {
    saveWaiting = true;
    await new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    await route.fallback();
  });
  await page.route("**/rest/v1/settings?**", async (route) => {
    if (
      new URL(route.request().url()).searchParams.get("section") === "eq.junior"
    ) {
      juniorWaiting = true;
      await new Promise<void>((resolve) => {
        releaseJunior = resolve;
      });
    }
    await route.fallback();
  });
  await page.goto(`/#!/members/${fixture.members[0].id}/`);
  await page
    .locator('input[aria-label^="Score /10 for"]:not(:disabled)')
    .first()
    .fill("9.25");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => saveWaiting).toBe(true);
  await switchSection(page, "junior", true);
  await expect.poll(() => juniorWaiting).toBe(true);
  const before = fixture.requests.filter(
    (request) => request.path === "/rest/v1/members",
  ).length;
  releaseSave();
  await expect
    .poll(() =>
      fixture.requests.some(
        (request) => request.path === "/rest/v1/rpc/save_member_marks_patch",
      ),
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        fixture.requests.filter(
          (request) => request.path === "/rest/v1/members",
        ).length,
    )
    .toBeGreaterThanOrEqual(before + 1);
  await page.waitForTimeout(100);
  releaseJunior();
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Loading workspace…", { exact: true }),
  ).toHaveCount(0);
  // A save legitimately reloads its individual member. It must not start a
  // stale whole-Company refresh that invalidates the deferred Junior owner.
  const memberRequests = fixture.requests
    .filter((request) => request.path === "/rest/v1/members")
    .slice(before);
  expect(
    memberRequests.filter((request) => {
      const query = new URLSearchParams(request.query);
      return query.get("section") === "eq.company" && !query.has("id");
    }),
  ).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});
