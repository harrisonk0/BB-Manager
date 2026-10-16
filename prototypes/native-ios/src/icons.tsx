import React from "react";
export type IconName =
  | "members"
  | "marks"
  | "squad"
  | "more"
  | "plus"
  | "search"
  | "filter"
  | "chevron"
  | "back"
  | "down"
  | "check"
  | "close"
  | "star"
  | "calendar"
  | "settings"
  | "key"
  | "sun"
  | "moon"
  | "bell"
  | "arrow"
  | "shield"
  | "archive"
  | "logout"
  | "edit"
  | "trash"
  | "wifi"
  | "clock"
  | "info"
  | "copy"
  | "download";
const paths: Record<IconName, React.ReactNode> = {
  members: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="9" cy="7" r="4" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  marks: (
    <>
      <rect x="5" y="4" width="14" height="18" rx="3" />
      <rect x="9" y="2" width="6" height="4" rx="1.5" />
      <path d="m8 13 2 2 5-5M8 19h8" />
    </>
  ),
  squad: (
    <>
      <path d="M4 20h16M5 17V9h3v8M10.5 17V4h3v13M16 17v-6h3v6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="7" />
      <path d="m16 16 4.4 4.4" />
    </>
  ),
  filter: (
    <>
      <path d="M4 7h16M7 12h10M10 17h4" />
      <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  down: <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 4 4 10-10" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  star: (
    <path d="m12 2 3 6 6.5 1-4.7 4.6 1.1 6.5-5.9-3.1-5.9 3.1 1.1-6.5L2.5 9 9 8Z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 2v6M17 2v6M3 11h18M7 15h2M12 15h2M7 18h2" />
    </>
  ),
  settings: (
    <>
      <path d="m9.5 3-.8 2.4-2 .9-2.3-.4-1.9 3.2 1.5 1.9v2.1L2.5 15l1.9 3.2 2.3-.4 2 .9.8 2.3h4.8l.8-2.3 2-.9 2.3.4 1.9-3.2-1.5-1.9V11l1.5-1.9-1.9-3.2-2.3.4-2-.9-.8-2.4Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="5" />
      <path d="m11.5 11.5 9 9M16 16l3-3M19 19l3-3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  shield: (
    <>
      <path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5Z" />
      <path d="m8 11 3 3 5-5" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="3" width="18" height="4" rx="1" />
      <path d="M5 7v14h14V7M9 11h6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 3H4v18h6M9 12h12m-5-5 5 5-5 5" />
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1 12-12a3.5 3.5 0 0 0-5-5L4 14Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </>
  ),
  wifi: (
    <>
      <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
};
export function Icon({
  name,
  size = 22,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
