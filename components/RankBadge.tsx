import React from "react";
import "./staff/staff.css";
import type { MemberRank } from "../types";
import { rankChevronPaths, rankDefinition } from "../services/memberRanks";

export default function RankBadge({ rank }: { rank?: MemberRank | null }) {
  if (!rank) return null;
  const definition = rankDefinition(rank);
  if (!definition) return null;
  return (
    <span
      role="img"
      aria-label={definition.label}
      title={definition.label}
      className="staff-rank-badge"
    >
      <svg
        viewBox="0 0 24 26"
        width="19"
        height="23"
        aria-hidden="true"
        focusable="false"
      >
        {rankChevronPaths(rank).map((path, index) => (
          <path key={index} d={path} fill="currentColor" />
        ))}
      </svg>
    </span>
  );
}

export function NameWithRank({
  name,
  memberRank,
}: {
  name: string;
  memberRank?: MemberRank | null;
}) {
  return (
    <span className="staff-ranked-name">
      <span>{name}</span>
      <RankBadge rank={memberRank} />
    </span>
  );
}
