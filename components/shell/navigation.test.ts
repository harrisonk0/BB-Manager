import { describe, expect, it } from "vitest";
import { allowedDestination, pathView, viewPath } from "./navigation";
describe("staff route contract", () => {
  it("retains the captain/admin section-settings boundary while preserving officer account and archives", () => {
    expect(allowedDestination({ page: "settings" }, "company", "officer")).toBe(
      false,
    );
    for (const role of ["captain", "admin"] as const)
      expect(allowedDestination({ page: "settings" }, "company", role)).toBe(
        true,
      );
    expect(
      allowedDestination({ page: "accountSettings" }, "company", "officer"),
    ).toBe(true);
    expect(allowedDestination({ page: "archives" }, "company", "officer")).toBe(
      true,
    );
  });
  it("roundtrips opaque member identifiers without treating them as URL paths", () => {
    const view = { page: "boyMarks", boyId: "member/with spaces?#" } as const;
    expect(pathView(viewPath(view))).toEqual(view);
  });
  it("normalizes the root route to members and rejects malformed or unknown deep links", () => {
    expect(pathView("/")).toEqual({ page: "home" });
    expect(pathView("/weeklyMarks/")).toEqual({ page: "weeklyMarks" });
    expect(pathView("/members/%zz/")).toBeNull();
    expect(pathView("/portal/calendar/")).toBeNull();
    expect(pathView("/unknown/")).toBeNull();
    expect(pathView(undefined)).toBeNull();
    expect(pathView(null)).toBeNull();
  });
  it("does not expose staff destinations before role resolution or to portal identities", () => {
    expect(allowedDestination({ page: "home" }, "company", null)).toBe(false);
    expect(allowedDestination({ page: "home" }, "company", "boy")).toBe(false);
  });
  it("preserves Company-only navigation in Junior workspaces", () => {
    for (const page of ["companyCalendar", "portalAccess"] as const) {
      expect(allowedDestination({ page }, "junior", "admin")).toBe(false);
      expect(allowedDestination({ page }, "company", "officer")).toBe(true);
    }
  });
});
