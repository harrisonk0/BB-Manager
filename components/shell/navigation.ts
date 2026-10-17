import { Section, UserRole, View } from "../../types";
export const staffDestinations = [
  { page: "home", title: "Members", icon: "users" },
  { page: "weeklyMarks", title: "Weekly Marks", icon: "check" },
  { page: "dashboard", title: "Dashboard", icon: "chart" },
  { page: "companyCalendar", title: "Calendar", icon: "calendar" },
  { page: "settings", title: "Settings", icon: "settings" },
  { page: "archives", title: "Archives", icon: "archive" },
  { page: "portalAccess", title: "Portal access", icon: "key" },
  { page: "accountSettings", title: "Account", icon: "account" },
] as const;
export function allowedDestination(
  view: View,
  section: Section,
  role: UserRole | null,
) {
  if (!role || role === "boy") return false;
  if (view.page === "settings" && !["admin", "captain"].includes(role))
    return false;
  if (
    (view.page === "companyCalendar" || view.page === "portalAccess") &&
    section !== "company"
  )
    return false;
  return true;
}
export function viewPath(view: View) {
  return view.page === "boyMarks"
    ? `/members/${encodeURIComponent(view.boyId)}/`
    : `/${view.page}/`;
}
export function pathView(path: string | undefined | null): View | null {
  if (typeof path !== "string") return null;
  const match = path.match(/^\/members\/([^/]+)\/?$/);
  if (match) {
    try {
      return { page: "boyMarks", boyId: decodeURIComponent(match[1]) };
    } catch {
      return null;
    }
  }
  const page = staffDestinations.find(
    (item) => path.replace(/\//g, "") === item.page,
  )?.page;
  return page
    ? { page }
    : path === "/" || path === ""
      ? { page: "home" }
      : null;
}
export function viewTitle(view: View) {
  return view.page === "boyMarks"
    ? "Member history"
    : staffDestinations.find((item) => item.page === view.page)?.title ||
        "Members";
}
