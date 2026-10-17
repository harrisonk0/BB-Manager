import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { installSyntheticBackend } from "./fixtures/backend";

test.describe.configure({ mode: "parallel" });

/** Real integrated application; HTTP-only invented fixtures. Baseline changes need independent visual review. */
const widths = [320, 375, 390, 430, 768, 1024, 1440];
const cases = [
  { name: "members", path: "/#!/home/", heading: "Members" },
  {
    name: "junior-members",
    path: "/#!/home/",
    heading: "Members",
    section: "junior" as const,
  },
  { name: "marks", path: "/#!/weeklyMarks/", heading: "Weekly Marks" },
  {
    name: "junior-marks",
    path: "/#!/weeklyMarks/",
    heading: "Weekly Marks",
    section: "junior" as const,
  },
  {
    name: "history",
    path: "/#!/members/00000000-0000-4000-8000-000000000100/",
    heading: "Member history",
  },
  {
    name: "junior-history",
    path: "/#!/members/00000000-0000-4000-8000-000000000100/",
    heading: "Member history",
    section: "junior" as const,
  },
  { name: "dashboard", path: "/#!/dashboard/", heading: "Dashboard" },
  { name: "archives", path: "/#!/archives/", heading: "Archives" },
  { name: "settings", path: "/#!/settings/", heading: "Settings" },
  { name: "calendar", path: "/#!/companyCalendar/", heading: "Calendar" },
  {
    name: "portal-access",
    path: "/#!/portalAccess/",
    heading: "Portal access",
  },
  { name: "account", path: "/#!/accountSettings/", heading: "Account" },
  { name: "portal", path: "/#!/portal/", heading: "My Company", portal: true },
  {
    name: "portal-calendar",
    path: "/#!/portal/calendar/",
    heading: "Calendar",
    portal: true,
  },
  {
    name: "portal-account",
    path: "/#!/portal/account/",
    heading: "Account",
    portal: true,
  },
  { name: "login", path: "/", heading: "Welcome back", signedOut: true },
  {
    name: "leader",
    path: "/#!/portal/squad/",
    heading: "My squad",
    portal: true,
    leader: true,
  },
];
for (const width of widths)
  for (const scenario of cases) {
    test(`visual ${scenario.name} ${width}`, async ({ page }, info) => {
      await page.clock.setFixedTime(new Date("2026-10-17T12:00:00Z"));
      const fixture = await installSyntheticBackend(page, {
        count: 30,
        section: "section" in scenario ? scenario.section : "company",
        role: "portal" in scenario ? "boy" : "captain",
        leader: "leader" in scenario && scenario.leader,
        signedOut: "signedOut" in scenario && scenario.signedOut,
      });
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (error) =>
        errors.push(error.stack || error.message),
      );
      await page.goto(scenario.path);
      await expect(
        page.getByRole("heading", { name: scenario.heading, exact: true }),
      ).toBeVisible();
      // Wait for actual asynchronous page data, not only the shell heading.
      if (scenario.name === "portal-access") {
        const generate = page.getByRole("button", {
          name: /Generate for \d+ boys without access/,
        });
        await expect(generate).toBeEnabled();
        await expect(page).toHaveTitle("Portal access · BB Manager");
        await expect(generate).toHaveCSS("opacity", "1");
      }
      if (scenario.name === "archives")
        await expect(page.getByText("2025–26", { exact: true })).toBeVisible();
      if (scenario.name === "portal")
        await expect(
          page.getByRole("heading", { name: "Next night", exact: true }),
        ).toBeVisible();
      if (scenario.name === "leader")
        await expect(page.locator(".squad-dashboard")).toBeVisible();
      if (scenario.name === "portal-calendar")
        await expect(
          page.getByRole("button", { name: "Month", exact: true }),
        ).toBeVisible();
      if (scenario.name === "portal-account")
        await expect(
          page.getByText("Username: synthetic.alex", { exact: true }),
        ).toBeVisible();
      await page.waitForTimeout(350);
      const dir = `test-results/frontend-visual/${info.project.name}`;
      await mkdir(dir, { recursive: true });
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const geometry = await page.evaluate(() => {
        const clippedControls: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(
          ".page-current .bb-page-body button,.page-current .bb-page-body input,.page-current .bb-page-body select,.page-current .bb-page-body textarea",
        )) {
          const box = el.getBoundingClientRect();
          if (!box.width || !box.height || el.closest("[inert],[hidden]"))
            continue;
          for (
            let parent = el.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            const style = getComputedStyle(parent);
            if (style.overflowX === "auto" || style.overflowX === "scroll")
              break;
            if (["hidden", "clip"].includes(style.overflowX)) {
              const clip = parent.getBoundingClientRect();
              if (box.left < clip.left - 1 || box.right > clip.right + 1) {
                clippedControls.push(
                  el.getAttribute("aria-label") ||
                    el.textContent?.trim() ||
                    el.tagName,
                );
                break;
              }
            }
          }
        }
        return {
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          overflow: document.documentElement.scrollWidth > innerWidth,
          main: document.querySelectorAll('main,[role="main"]').length,
          pageHeight:
            document.querySelector(".page-current")?.getBoundingClientRect()
              .height ?? null,
          clippedControls,
        };
      });
      await writeFile(
        `${dir}/${scenario.name}-${width}.json`,
        JSON.stringify(
          {
            scenario: scenario.name,
            width,
            browserVersion: page.context().browser()?.version(),
            errors,
            geometry,
            violations: scan.violations,
            unexpected: fixture.unexpected,
          },
          null,
          2,
        ),
      );
      await page.screenshot({
        path: `${dir}/${scenario.name}-${width}-top.png`,
        animations: "disabled",
      });
      await expect(
        page.getByRole("heading", { name: scenario.heading, exact: true }),
        "Page remains visible after loading",
      ).toBeVisible();
      const scroll = page.locator(".page-current .page-content").last();
      if (await scroll.count())
        await scroll.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
      await page.waitForTimeout(120); // Allow native scroll-edge/title lifecycle to settle.
      await page.screenshot({
        path: `${dir}/${scenario.name}-${width}-lower.png`,
        animations: "disabled",
      });
      if (await scroll.count())
        await scroll.evaluate((el) => {
          el.scrollTop = 0;
        });
      await page.waitForTimeout(120);
      expect.soft(errors, "JavaScript page exceptions").toEqual([]);
      expect
        .soft(fixture.unexpected, "No unexpected external/backend endpoints")
        .toEqual([]);
      expect.soft(geometry.overflow, "Document reflow").toBe(false);
      expect
        .soft(
          geometry.clippedControls,
          "Controls remain visible inside grouped surfaces",
        )
        .toEqual([]);
      if ("portal" in scenario)
        expect
          .soft(geometry.pageHeight, "Portal native view fills viewport")
          .toBeGreaterThanOrEqual(843);
      if (geometry.pageHeight !== null)
        expect
          .soft(geometry.pageHeight, "Framework7 page has a visible viewport")
          .toBeGreaterThan(300);
      expect
        .soft(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          "WCAG automated scan",
        )
        .toEqual([]);
      if (
        info.project.name === "chromium" &&
        process.env.FRONTEND_CAPTURE_ONLY !== "1"
      )
        await expect(page).toHaveScreenshot(`${scenario.name}-${width}.png`, {
          animations: "disabled",
          maxDiffPixelRatio: 0.002,
        });
    });
  }

for (const width of [390, 768])
  for (const kind of [
    "filter",
    "editor",
    "workspace",
    "destructive",
  ] as const) {
    test(`visual sheet ${kind} ${width}`, async ({ page }, info) => {
      await page.clock.setFixedTime(new Date("2026-10-17T12:00:00Z"));
      const fixture = await installSyntheticBackend(page, { count: 30 });
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/#!/home/");
      await expect(
        page.getByRole("heading", { name: "Members", exact: true }),
      ).toBeVisible();
      if (kind === "filter")
        await page
          .getByRole("button", { name: "Open sort and filter options" })
          .click();
      if (kind === "editor")
        await page
          .getByRole("button", { name: "Add Boy", exact: true })
          .click();
      if (kind === "workspace")
        await page
          .getByRole("button", { name: "Workspace and account" })
          .click();
      if (kind === "destructive") {
        await page
          .getByLabel("Search members", { exact: true })
          .fill("Alexander");
        await page
          .getByLabel("Actions for Alexander Montgomery-Worthington", {
            exact: true,
          })
          .click();
        await page
          .getByRole("button", {
            name: "Delete Alexander Montgomery-Worthington",
            exact: true,
          })
          .click();
      }
      const dialog = page.getByRole("dialog");
      await expect(dialog).toHaveCount(1);
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(400);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const dir = `test-results/frontend-visual/${info.project.name}`;
      await mkdir(dir, { recursive: true });
      await writeFile(
        `${dir}/sheet-${kind}-${width}.json`,
        JSON.stringify(
          {
            width,
            kind,
            violations: scan.violations,
            unexpected: fixture.unexpected,
          },
          null,
          2,
        ),
      );
      await page.screenshot({
        path: `${dir}/sheet-${kind}-${width}-top.png`,
        animations: "disabled",
      });
      expect
        .soft(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          "Sheet automated accessibility",
        )
        .toEqual([]);
      expect(fixture.unexpected).toEqual([]);
      if (
        info.project.name === "chromium" &&
        process.env.FRONTEND_CAPTURE_ONLY !== "1"
      )
        await expect(page).toHaveScreenshot(`sheet-${kind}-${width}.png`, {
          animations: "disabled",
          maxDiffPixelRatio: 0.002,
        });
      await dialog.locator(".bb-sheet-content").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.screenshot({
        path: `${dir}/sheet-${kind}-${width}-lower.png`,
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });
  }
