import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { installSyntheticBackend } from "./fixtures/backend";
const name = "Alexander Montgomery-Worthington";
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-17T12:00:00Z"));
});
async function open(page: Page, path = "home") {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/#!/${path}/`);
  await expect(
    page
      .locator(".page-current:not([inert])")
      .getByRole("heading", { level: 1 }),
  ).toBeVisible();
}
async function futureMarks(page: Page) {
  await open(page, "weeklyMarks");
  await page.getByLabel("Select weekly marks date").fill("2026-10-30");
  const change = page.getByRole("button", { name: "Change Date", exact: true });
  if (await change.isVisible()) await change.click();
}

test("roster create, NCO edit, dirty cancel and delete preserve real service payloads", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await open(page);
  await page.getByRole("button", { name: "Add Boy", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Add member", exact: true });
  await sheet.getByLabel("Name", { exact: true }).fill("Zephyr Synthetic");
  await sheet.getByLabel("School year", { exact: true }).selectOption("11");
  await sheet.getByLabel("Rank (optional)").selectOption("corporal");
  await sheet.getByLabel("Squad", { exact: true }).selectOption("2");
  await sheet.getByRole("button", { name: "Add Boy", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  expect(
    fixture.members.find((row) => row.name === "Zephyr Synthetic")?.rank,
  ).toBe("corporal");
  await page
    .getByRole("searchbox", { name: "Search members" })
    .fill("Zephyr Synthetic");
  await page
    .getByLabel("Actions for Zephyr Synthetic", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit Zephyr Synthetic", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Edit member", exact: true });
  await edit.getByLabel("Name", { exact: true }).fill("Unsaved name");
  await edit.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    edit.getByRole("button", { name: "Keep editing" }),
  ).toBeVisible();
  await edit.getByRole("button", { name: "Keep editing" }).click();
  await edit
    .getByLabel("Name", { exact: true })
    .fill("Zephyr Synthetic Updated");
  await edit.getByRole("button", { name: "Update Boy", exact: true }).click();
  await expect(edit).not.toBeVisible();
  await page
    .getByLabel("Actions for Zephyr Synthetic Updated", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Delete Zephyr Synthetic Updated",
      exact: true,
    })
    .click();
  const confirm = page.getByRole("dialog");
  await confirm.getByRole("button", { name: /Delete/, exact: true }).click();
  await expect(confirm).not.toBeVisible();
  expect(fixture.members.some((row) => row.name.startsWith("Zephyr"))).toBe(
    false,
  );
  expect(fixture.unexpected).toEqual([]);
});

for (const section of ["company", "junior"] as const) {
  test(`${section} marks preserve attendance cycle, blank/zero and failed-save draft`, async ({
    page,
  }) => {
    const fixture = await installSyntheticBackend(page, { section });
    await futureMarks(page);
    const attendance = page.getByRole("button", {
      name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
    });
    await attendance.click();
    if (section === "company")
      await page.getByLabel(`Score /10 for ${name}`, { exact: true }).fill("0");
    else {
      await page
        .getByLabel(`Uniform /10 for ${name}`, { exact: true })
        .fill("0");
      await page
        .getByLabel(`Behaviour /5 for ${name}`, { exact: true })
        .fill("4.25");
    }
    fixture.failSaves = true;
    await page.getByRole("button", { name: "Save Marks", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Retry save", exact: true }),
    ).toBeEnabled();
    expect(fixture.marks.some((mark) => mark.date === "2026-10-30")).toBe(
      false,
    );
    fixture.failSaves = false;
    await page.getByRole("button", { name: "Retry save", exact: true }).click();
    await expect
      .poll(
        () =>
          fixture.marks.find(
            (mark) =>
              mark.date === "2026-10-30" &&
              mark.member_id === fixture.members[0].id,
          )?.score,
      )
      .toBe(section === "company" ? 0 : 4.25);
    while (
      await page
        .getByRole("button", { name: "Dismiss notification", exact: true })
        .count()
    )
      await page
        .getByRole("button", { name: "Dismiss notification", exact: true })
        .first()
        .click();
    const present = page.getByRole("button", {
      name: new RegExp(`^Present, ${name}.*Mark as absent`),
    });
    await present.evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );
    await present.click();
    await page
      .getByRole("button", {
        name: new RegExp(`^Absent, ${name}.*Clear attendance`),
      })
      .click();
    await page.getByRole("button", { name: "Save Marks", exact: true }).click();
    await expect
      .poll(() =>
        fixture.marks.some(
          (mark) =>
            mark.date === "2026-10-30" &&
            mark.member_id === fixture.members[0].id,
        ),
      )
      .toBe(false);
    expect(fixture.unexpected).toEqual([]);
  });
}

test("archives retain read failures, retry safely and distinguish empty archive", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page, { archiveError: true });
  await open(page, "archives");
  await expect(
    page.getByText("Past sessions could not load", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No past sessions yet", { exact: true }),
  ).toHaveCount(0);
  fixture.failArchives = false;
  while (
    await page
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .first()
      .click();
  await page
    .getByRole("button", { name: "Retry past sessions", exact: true })
    .click();
  await page.getByText("2025–26", { exact: true }).click();
  await expect(
    page.getByText("No Company Section members in this archive", {
      exact: true,
    }),
  ).toBeVisible();
  expect(fixture.unexpected).toEqual([]);
});

test("dashboard opens real PDF renderer and downloads a synthetic report", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page, { count: 3 });
  await open(page, "dashboard");
  await page
    .getByRole("button", { name: "Generate Master PDF", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Master Session PDF" });
  await expect(sheet).toBeVisible();
  const link = sheet.getByRole("link", {
    name: "Download Master PDF",
    exact: true,
  });
  await expect(link).toBeVisible({ timeout: 30000 });
  const downloadPromise = page.waitForEvent("download");
  await link.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await download.failure()).toBeNull();
  const artifact = await download.path();
  expect(artifact).toBeTruthy();
  const bytes = await readFile(artifact!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(1000);
  expect(fixture.unexpected).toEqual([]);
});

test("calendar editor sends London-local values through unchanged RPC", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await open(page, "companyCalendar");
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Add event", exact: true });
  await sheet
    .getByLabel("Title", { exact: true })
    .fill("Synthetic winter activity");
  await sheet.getByLabel("Starts (London time)").fill("2027-01-08T19:00");
  await sheet.getByLabel("Ends (London time)").fill("2027-01-08T21:00");
  await sheet.getByLabel("Location", { exact: true }).fill("Synthetic BB Hall");
  await sheet.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  const request = fixture.requests.find((item) =>
    item.path.endsWith("/save_company_event"),
  );
  expect(request?.body).toMatchObject({
    p_title: "Synthetic winter activity",
    p_starts_local: "2027-01-08T19:00",
    p_ends_local: "2027-01-08T21:00",
  });
  expect(fixture.unexpected).toEqual([]);
});

test("portal reset confirmation delivers only synthetic setup link", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await open(page, "portalAccess");
  const row = page
    .locator("li")
    .filter({ has: page.getByRole("heading", { name: new RegExp(name) }) });
  await row.getByRole("button", { name: "Reset access", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Reset portal access" });
  await expect(sheet).toBeVisible();
  await sheet
    .getByRole("button", { name: "Reset and generate link", exact: true })
    .click();
  await expect(sheet).not.toBeVisible();
  await expect(page.getByLabel(`Setup link for ${name}`)).toHaveValue(
    /example.invalid/,
  );
  expect(fixture.unexpected).toEqual([]);
});

test("StrictMode setup link remains visible while sensitive query is scrubbed", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page, { signedOut: true });
  await page.goto("/?username=synthetic.alex&code=SYNTHETIC-SETUP-ONLY");
  await expect(
    page.getByRole("heading", { name: "Welcome, synthetic.alex" }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("code")).toBe(false);
  expect(new URL(page.url()).searchParams.has("username")).toBe(false);
  expect(
    fixture.requests.some((request) =>
      request.path.includes("/company-portal"),
    ),
  ).toBe(false);
  expect(fixture.unexpected).toEqual([]);
});

test("new session requires typed confirmation and report acknowledgement", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await open(page, "settings");
  await page
    .getByRole("button", { name: "Start new BB session", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Start a new BB session?" });
  const action = sheet.getByRole("button", {
    name: "Archive and start fresh",
    exact: true,
  });
  await expect(action).toBeDisabled();
  await sheet
    .getByLabel("Type START NEW SESSION to confirm")
    .fill("START NEW SESSION");
  await expect(action).toBeDisabled();
  await sheet.getByRole("checkbox").check();
  await expect(action).toBeEnabled();
  await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    fixture.requests.some((request) =>
      request.path.endsWith("/start_new_bb_session"),
    ),
  ).toBe(false);
  expect(fixture.unexpected).toEqual([]);
});

test("pending real member creation and deletion keep confirmation physically open", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  let release: () => void = () => {};
  let waiting = false;
  await page.route("**/rest/v1/members?**", async (route) => {
    if (["POST", "DELETE"].includes(route.request().method())) {
      waiting = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    await route.fallback();
  });
  await open(page);
  await page.getByRole("button", { name: "Add Boy", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Add member", exact: true });
  await editor.getByLabel("Name", { exact: true }).fill("Pending Synthetic");
  await editor.getByLabel("School year", { exact: true }).selectOption("11");
  await editor.getByLabel("Squad", { exact: true }).selectOption("1");
  await page.waitForTimeout(650);
  await editor.getByRole("button", { name: "Add Boy", exact: true }).click();
  await expect.poll(() => waiting).toBe(true);
  await page.keyboard.press("Escape");
  await expect(editor).toBeVisible();
  await expect(
    editor.getByRole("button", { name: "Close sheet" }),
  ).toBeDisabled();
  await page
    .locator(".sheet-backdrop.backdrop-in")
    .click({ position: { x: 4, y: 4 }, force: true });
  await expect(editor).toBeVisible();
  release();
  await expect(editor).not.toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search members" })
    .fill("Pending Synthetic");
  await page
    .getByLabel("Actions for Pending Synthetic", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete Pending Synthetic", exact: true })
    .click();
  const confirmation = page.getByRole("dialog");
  await page.waitForTimeout(650);
  waiting = false;
  await confirmation
    .getByRole("button", { name: /Delete/, exact: true })
    .click();
  await expect.poll(() => waiting).toBe(true);
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeVisible();
  await expect(
    confirmation.getByRole("button", { name: "Close sheet" }),
  ).toBeDisabled();
  release();
  await expect(confirmation).not.toBeVisible();
  expect(
    fixture.members.some((member) => member.name === "Pending Synthetic"),
  ).toBe(false);
  expect(fixture.unexpected).toEqual([]);
});

test("import controls keep native leader toggle usable and block dismissal during real create", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page, { archived: true });
  let release: () => void = () => {};
  let waiting = false;
  await page.route("**/rest/v1/members?**", async (route) => {
    if (route.request().method() === "POST") {
      waiting = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    await route.fallback();
  });
  await open(page);
  await page.getByLabel("More roster actions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Import from a past session", exact: true })
    .click();
  const sheet = page.getByRole("dialog", {
    name: "Import from a past session",
  });
  await expect(
    sheet.getByLabel("Import Returning Synthetic", { exact: true }),
  ).toBeChecked();
  const leader = sheet.getByRole("checkbox", {
    name: "Squad leader: Returning Synthetic",
    exact: true,
  });
  await leader.focus();
  await page.keyboard.press("Space");
  await expect(leader).toBeChecked();
  await page.waitForTimeout(650);
  await sheet
    .getByRole("button", { name: "Import 1 member", exact: true })
    .click();
  await expect.poll(() => waiting).toBe(true);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Close sheet" }),
  ).toBeDisabled();
  release();
  await expect(sheet).not.toBeVisible();
  expect(
    fixture.members.find((member) => member.name === "Returning Synthetic"),
  ).toMatchObject({
    school_year: "12",
    is_squad_leader: true,
    rank: "corporal",
  });
  expect(fixture.unexpected).toEqual([]);
});

test("member history retains failed-save edits and persists corrections and deletion", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await open(page, `members/${fixture.members[0].id}`);
  await expect(
    page.getByRole("heading", { name: `${name}'s Marks` }),
  ).toBeVisible();
  const input = page
    .locator('input[aria-label^="Score /10 for"]:not(:disabled)')
    .first();
  await input.fill("8.25");
  fixture.failSaves = true;
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry save", exact: true }),
  ).toBeEnabled();
  await expect(input).toHaveValue("8.25");
  fixture.failSaves = false;
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect
    .poll(() =>
      fixture.marks.some(
        (mark) =>
          mark.member_id === fixture.members[0].id && mark.score === 8.25,
      ),
    )
    .toBe(true);
  const before = fixture.marks.filter(
    (mark) => mark.member_id === fixture.members[0].id,
  ).length;
  await page
    .getByRole("button", { name: /^Delete mark for/ })
    .first()
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Delete meeting record?",
  });
  await confirmation
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect
    .poll(
      () =>
        fixture.marks.filter((mark) => mark.member_id === fixture.members[0].id)
          .length,
    )
    .toBe(before - 1);
  expect(fixture.unexpected).toEqual([]);
});

test("dirty browser Back restores cursor on Stay, then Leave and Forward work", async ({
  page,
}) => {
  await installSyntheticBackend(page);
  await open(page);
  await page.getByRole("button", { name: "Marks", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Weekly Marks", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Select weekly marks date").fill("2026-10-30");
  await page
    .getByRole("button", {
      name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
    })
    .click();
  const input = page.getByLabel(`Score /10 for ${name}`, { exact: true });
  await input.fill("9.25");
  await page.evaluate(() => history.back());
  let confirmation = page.getByRole("dialog", { name: "Unsaved Changes" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(input).toHaveValue("9.25");
  await expect(page).toHaveURL(/weeklyMarks/);
  await page.evaluate(() => history.back());
  confirmation = page.getByRole("dialog", { name: "Unsaved Changes" });
  await expect(confirmation).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Leave", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Members", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => history.forward());
  await expect(
    page.getByRole("heading", { name: "Weekly Marks", exact: true }),
  ).toBeVisible();
});

test("confirmed new session blocks dismissal until real archive service returns", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  let waiting = false;
  let release: () => void = () => {};
  await page.route("**/rest/v1/rpc/start_new_bb_session", async (route) => {
    waiting = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fallback();
  });
  await open(page, "settings");
  await page
    .getByRole("button", { name: "Start new BB session", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "Start a new BB session?" });
  await sheet
    .getByLabel("Type START NEW SESSION to confirm")
    .fill("START NEW SESSION");
  await sheet.getByRole("checkbox").check();
  await page.waitForTimeout(650);
  await sheet
    .getByRole("button", { name: "Archive and start fresh", exact: true })
    .click();
  await expect.poll(() => waiting).toBe(true);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Close sheet" }),
  ).toBeDisabled();
  release();
  await expect(sheet).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Archives", exact: true }),
  ).toBeVisible();
  expect(fixture.members).toHaveLength(0);
  expect(fixture.marks).toHaveLength(0);
  expect(fixture.unexpected).toEqual([]);
});

test("calendar generation retains configured London settings and poster is a real download", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await open(page, "companyCalendar");
  await page
    .getByText("Weekly nights for the BB year", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Save and generate weekly nights",
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      fixture.requests.some((request) =>
        request.path.endsWith("/generate_company_nights"),
      ),
    )
    .toBe(true);
  expect(
    fixture.requests.find(
      (request) =>
        request.path === "/rest/v1/company_calendar_settings" &&
        request.method === "POST",
    )?.body,
  ).toMatchObject({
    timezone: "Europe/London",
    starts_at: "19:00",
    ends_at: "21:00",
  });
  await page
    .getByText("Weekly nights for the BB year", { exact: true })
    .click();
  for (let month = 0; month < 3; month++)
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Company night", exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Poster PDF", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/poster\.pdf$/);
  expect(await download.failure()).toBeNull();
  const artifact = await download.path();
  expect(artifact).toBeTruthy();
  const bytes = await readFile(artifact!);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(1000);
  expect(fixture.unexpected).toEqual([]);
});

test("workspace-to-dirty-confirmation handoff preserves modal isolation and restores marks", async ({
  page,
}) => {
  const fixture = await installSyntheticBackend(page);
  await futureMarks(page);
  await page
    .getByRole("button", {
      name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
    })
    .click();
  const input = page.getByLabel(`Score /10 for ${name}`, { exact: true });
  await input.fill("9.25");
  for (const action of ["Switch section", "Sign out"]) {
    await page
      .getByRole("button", { name: "Workspace and account", exact: true })
      .click();
    const workspace = page.getByRole("dialog", {
      name: "Workspace",
      exact: true,
    });
    await expect(workspace).toBeVisible();
    await page.waitForTimeout(650);
    await workspace.getByRole("button", { name: action, exact: true }).click();
    const confirmation = page.getByRole("dialog", {
      name: "Unsaved Changes",
      exact: true,
    });
    await expect(confirmation).toBeVisible();
    await page.waitForTimeout(650);
    await expect(page.locator("#staff-main")).toHaveAttribute("inert", "");
    await confirmation
      .getByRole("button", { name: "Stay", exact: true })
      .click();
    await expect(confirmation).not.toBeVisible();
    await expect(page.locator("#staff-main")).not.toHaveAttribute("inert", "");
    await expect(input).toHaveValue("9.25");
    await input.fill("9.5");
    await input.fill("9.25");
  }
  await page
    .getByRole("button", { name: "Workspace and account", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Workspace", exact: true })
    .getByRole("button", { name: "Close sheet" })
    .click();
  await expect(page.locator("#staff-main")).not.toHaveAttribute("inert", "");
  expect(
    fixture.requests.some((request) => request.path === "/auth/v1/logout"),
  ).toBe(false);
  expect(fixture.unexpected).toEqual([]);
});

for (const bookmark of ["missing-page", "portal/account"])
  test(`staff stale or unknown bookmark ${bookmark} resolves to a usable roster`, async ({
    page,
  }) => {
    const fixture = await installSyntheticBackend(page);
    await page.goto(`/#!/${bookmark}/`);
    await expect(
      page.getByRole("heading", { name: "Members", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Search members" }),
    ).toBeVisible();
    await expect(page.locator(".page-current")).toHaveCount(1);
    expect(fixture.unexpected).toEqual([]);
  });

for (const section of ["company", "junior"] as const)
  test(`${section} invalid score focuses its error before corrected real save`, async ({
    page,
  }) => {
    const fixture = await installSyntheticBackend(page, { section });
    await futureMarks(page);
    await page
      .getByRole("button", {
        name: new RegExp(`^Not recorded, ${name}.*Mark as present`),
      })
      .click();
    const input = page.getByLabel(
      section === "company"
        ? `Score /10 for ${name}`
        : `Behaviour /5 for ${name}`,
      { exact: true },
    );
    if (section === "junior")
      await page
        .getByLabel(`Uniform /10 for ${name}`, { exact: true })
        .fill("5");
    await input.fill(section === "company" ? "11" : "5.25");
    await page.getByRole("button", { name: "Save Marks", exact: true }).click();
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    expect(
      fixture.requests.some((request) =>
        request.path.endsWith("/save_weekly_marks_snapshot"),
      ),
    ).toBe(false);
    while (
      await page
        .getByRole("button", { name: "Dismiss notification", exact: true })
        .count()
    )
      await page
        .getByRole("button", { name: "Dismiss notification", exact: true })
        .first()
        .click();
    await input.fill(section === "company" ? "9.25" : "4.25");
    await page.getByRole("button", { name: "Save Marks", exact: true }).click();
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
