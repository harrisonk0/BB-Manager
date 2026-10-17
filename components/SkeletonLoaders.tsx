import React from "react";

function SkeletonRows({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="bb-loading-surface"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="bb-sr-only">{label}</span>
      <div className="bb-skeleton-title" aria-hidden="true" />
      <div className="bb-skeleton-group" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div className="bb-skeleton-row" key={i}>
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
export const HomePageSkeleton = () => (
  <SkeletonRows label="Loading your workspace…" count={6} />
);
export const BoyMarksPageSkeleton = () => (
  <SkeletonRows label="Loading member history…" count={5} />
);
