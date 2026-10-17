import { test, expect } from "@playwright/test";
import { installSyntheticBackend } from "./fixtures/backend";
for (const width of [320, 375, 390, 430, 768, 1024, 1440])
  test(`leader report retains readable long names and all metrics at ${width}px`, async ({
    page,
  }, info) => {
    const fixture = await installSyntheticBackend(page, {
      role: "boy",
      leader: true,
    });
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#!/portal/squad/");
    await expect(
      page
        .locator(".page-current")
        .getByRole("heading", { name: "My squad", exact: true }),
    ).toBeVisible();
    const name = page
      .locator(
        ".page-current .sd-roster .staff-ranked-name:visible > span:first-child",
      )
      .first();
    await expect(name).toHaveText("Alexander Montgomery-Worthington");
    await name.scrollIntoViewIfNeeded();
    const geometry = await name.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        font: parseFloat(style.fontSize),
        line: parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3,
      };
    });
    expect(geometry.width).toBeGreaterThanOrEqual(110);
    expect(geometry.font).toBeGreaterThanOrEqual(15);
    expect(geometry.height).toBeLessThanOrEqual(geometry.line * 3 + 2);
    const mobile = page.locator(".page-current .sd-mobile-roster");
    if (await mobile.isVisible()) {
      for (const title of [
        "Total so far",
        "Year attendance",
        "Present / recorded",
      ])
        await expect(
          mobile.getByText(title, { exact: true }).first(),
        ).toBeVisible();
      await expect(mobile.locator("dd")).toHaveCount(4);
    } else {
      for (const title of ["This night", "Total so far", "Year attendance"])
        await expect(
          page
            .locator(".page-current .sd-roster")
            .getByRole("columnheader", { name: title, exact: true }),
        ).toBeVisible();
      await expect(
        page.locator(".page-current .sd-roster tbody tr"),
      ).toHaveCount(1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`leader-${width}.png`) });
    await info.attach("long-name-geometry", {
      body: JSON.stringify(geometry),
      contentType: "application/json",
    });
    await page.getByRole("link", { name: "Account", exact: true }).click();
    await expect(
      page
        .locator(".page-current")
        .getByRole("checkbox", { name: "Event updates", exact: true }),
    ).toBeVisible();
    expect(fixture.unexpected).toEqual([]);
  });
