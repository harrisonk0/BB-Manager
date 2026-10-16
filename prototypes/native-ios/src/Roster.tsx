import React, { useMemo, useState } from "react";
import {
  attendancePercent,
  squads,
  yearLabel,
  type Member,
  type Section,
} from "./data";
import { Icon } from "./icons";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  PageTitle,
  Segmented,
  Sheet,
} from "./ui";

export function Roster({
  members,
  section,
  onMember,
  onAdd,
}: {
  members: Member[];
  section: Section;
  onMember: (member: Member) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [squad, setSquad] = useState("all");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState("name");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtered = useMemo(
    () =>
      members
        .filter(
          (member) =>
            member.name
              .toLocaleLowerCase("en-GB")
              .includes(search.toLocaleLowerCase("en-GB")) &&
            (segment === "all" || member.leader) &&
            (squad === "all" || member.squad === Number(squad)) &&
            (year === "all" || yearLabel(member, section) === year),
        )
        .sort((a, b) =>
          sort === "marks" ? b.total - a.total : a.name.localeCompare(b.name),
        ),
    [members, search, segment, squad, year, sort, section],
  );
  const activeFilters =
    (squad !== "all" ? 1 : 0) +
    (year !== "all" ? 1 : 0) +
    (sort !== "name" ? 1 : 0);
  const clear = () => {
    setSquad("all");
    setYear("all");
    setSearch("");
    setSegment("all");
    setSort("name");
  };
  return (
    <>
      <PageTitle
        title="Members"
        subtitle={`${members.length} members · ${squads.length} squads`}
        action={
          <IconButton
            className="add-button"
            icon="plus"
            label="Add member"
            onClick={onAdd}
          />
        }
      />
      <div className="search-toolbar">
        <label className="search-field">
          <Icon name="search" size={20} />
          <input
            type="search"
            name="member-search"
            placeholder="Search members"
            aria-label="Search members"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <IconButton
          icon="filter"
          label={`Filter members${activeFilters ? `, ${activeFilters} active` : ""}`}
          aria-expanded={filtersOpen}
          className={activeFilters ? "filter-active" : ""}
          onClick={() => setFiltersOpen(true)}
        />
      </div>
      <Segmented
        label="Member view"
        value={segment}
        onChange={setSegment}
        options={[
          { value: "all", label: "All members" },
          { value: "leaders", label: "Leaders" },
        ]}
      />
      {(activeFilters > 0 || search || segment !== "all") && (
        <div className="filter-summary">
          <span>
            {filtered.length} {filtered.length === 1 ? "member" : "members"}{" "}
            shown
          </span>
          <button className="text-button" onClick={clear}>
            Reset filters
          </button>
        </div>
      )}
      <div className="roster-groups">
        {squads.map((group) => {
          const groupMembers = filtered.filter(
            (member) => member.squad === group.id,
          );
          return (
            groupMembers.length > 0 && (
              <section
                className="list-group"
                key={group.id}
                aria-labelledby={`roster-squad-${group.id}`}
              >
                <header className="group-heading">
                  <div>
                    <span
                      className={`squad-dot squad-dot-${group.id}`}
                      aria-hidden="true"
                    />
                    <h2 id={`roster-squad-${group.id}`}>
                      Squad {group.id} <span>· {group.name}</span>
                    </h2>
                  </div>
                  <span className="group-count">
                    {groupMembers.length} members
                  </span>
                </header>
                <ul className="member-list">
                  {groupMembers.map((member) => (
                    <li key={member.id}>
                      <button
                        className="member-row"
                        onClick={() => onMember(member)}
                      >
                        <span className="sr-only">View </span>
                        <Avatar name={member.name} squad={member.squad} />
                        <span className="member-copy">
                          <span className="member-name">
                            {member.name}
                            {member.leader && (
                              <span
                                className="leader-star"
                                aria-label="Squad leader"
                              >
                                <Icon name="star" size={14} />
                              </span>
                            )}
                          </span>
                          <span className="member-meta">
                            {yearLabel(member, section)}{" "}
                            <span aria-hidden="true">·</span>{" "}
                            {attendancePercent(member)}% attendance
                          </span>
                        </span>
                        <span className="desktop-row-total">
                          <strong>{member.total}</strong>
                          <span>marks</span>
                        </span>
                        <Icon name="chevron" size={17} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          );
        })}
      </div>
      {filtered.length === 0 && (
        <EmptyState
          title={members.length ? "No matching members" : "A fresh start"}
          action={
            <Button
              variant="secondary"
              onClick={members.length ? clear : onAdd}
            >
              {members.length
                ? "Clear search & filters"
                : "Add your first member"}
            </Button>
          }
        >
          {members.length
            ? "Try a different name, squad or school year."
            : "Add a member to begin building your roster."}
        </EmptyState>
      )}
      <p className="section-footnote">
        <Icon name="star" size={13} /> A star marks your squad leaders.
      </p>
      {filtersOpen && (
        <Sheet
          title="Sort & filter"
          onClose={() => setFiltersOpen(false)}
          footer={
            <Button onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} members
            </Button>
          }
        >
          <p className="sheet-intro">
            Find the right people, without losing your place.
          </p>
          <fieldset className="field-stack">
            <legend>Squad</legend>
            <Segmented
              label="Filter by squad"
              options={[
                { value: "all", label: "All" },
                ...squads.map((group) => ({
                  value: String(group.id),
                  label: String(group.id),
                })),
              ]}
              value={squad}
              onChange={setSquad}
            />
          </fieldset>
          <label className="form-field">
            School year
            <select
              name="filter-year"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            >
              <option value="all">All years</option>
              {Array.from(
                new Set(members.map((member) => yearLabel(member, section))),
              )
                .sort()
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </label>
          <fieldset className="field-stack">
            <legend>Sort by</legend>
            <Segmented
              label="Sort members"
              value={sort}
              onChange={setSort}
              options={[
                { value: "name", label: "Name" },
                { value: "marks", label: "Total marks" },
              ]}
            />
          </fieldset>
          <Button variant="quiet" onClick={clear}>
            Reset all filters
          </Button>
        </Sheet>
      )}
    </>
  );
}
