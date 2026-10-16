import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  initialMembers,
  seedEntries,
  emptyEntry,
  entryError,
  weeks,
  initialDate,
  type Entry,
  type Member,
  type Section,
  type Role,
} from "../../native-ios/src/data";
export * from "../../native-ios/src/data";
export type RankedMember = Member & {
  rank?: "Lance Corporal" | "Corporal" | "Sergeant" | "Staff Sergeant";
};
export type Screen = "members" | "marks" | "squad" | "settings" | "home";
export type Overlay = {
  kind:
    | "filter"
    | "workspace"
    | "date"
    | "editor"
    | "delete"
    | "clear"
    | "discard"
    | "report"
    | "about"
    | "actions";
  id?: string;
  nextDate?: string;
  nextSection?: Section;
};
const fixtures: RankedMember[] = initialMembers.map((m, i) => ({
  ...m,
  rank:
    i === 3
      ? "Lance Corporal"
      : i === 4
        ? "Corporal"
        : i === 5
          ? "Sergeant"
          : undefined,
}));
const juniorFixtures: RankedMember[] = fixtures.map((m, i) => ({
  ...m,
  year: 8 + (i % 4),
  rank: undefined,
  leader: false,
}));
const params = new URLSearchParams(location.search);
function useController() {
  const role: Role =
    params.get("role") === "leader"
      ? "leader"
      : params.get("role") === "boy"
        ? "boy"
        : "staff";
  const [section, setSection] = useState<Section>(
    role === "staff" && params.get("section") === "junior"
      ? "junior"
      : "company",
  );
  const initialFixture = section === "junior" ? juniorFixtures : fixtures;
  const [members, setMembers] = useState(initialFixture);
  const [date, setDate] = useState(initialDate);
  const [entries, setEntries] = useState(() => seedEntries(initialFixture));
  const [saved, setSaved] = useState<Record<string, Record<string, Entry>>>({
    [initialDate]: seedEntries(initialFixture),
  });
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [squad, setSquad] = useState("all");
  const [year, setYear] = useState("all");
  const [marksSquad, setMarksSquad] = useState("all");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [offline, setOffline] = useState(params.get("offline") === "1");
  const [motion, setMotion] = useState(false);
  const [solid, setSolid] = useState(false);
  const [week, setWeek] = useState(7);
  const [reportSquad, setReportSquad] = useState(1);
  const baseline = saved[date] || seedEntries(members, date);
  const dirty = members.filter(
    (m) =>
      JSON.stringify(entries[m.id] || emptyEntry()) !==
      JSON.stringify(baseline[m.id] || emptyEntry()),
  ).length;
  const filtered = useMemo(
    () =>
      members
        .filter(
          (m) =>
            m.name.toLowerCase().includes(search.toLowerCase()) &&
            (mode === "all" || m.leader) &&
            (squad === "all" || m.squad === Number(squad)) &&
            (year === "all" || m.year === Number(year)),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members, search, mode, squad, year],
  );
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", motion);
    document.documentElement.classList.toggle("solid-material", solid);
  }, [motion, solid]);
  const changeEntry = (id: string, patch: Partial<Entry>) => {
    if (saving) return;
    setEntries((v) => ({ ...v, [id]: { ...v[id], ...patch } }));
    setStatus("");
    setError("");
  };
  const applyDate = (next: string) => {
    setDate(next);
    setEntries(saved[next] || seedEntries(members, next));
    setUnlocked(false);
    setError("");
    setStatus("");
    setOverlay(null);
  };
  const chooseDate = (next: string) => {
    if (saving || next === date) {
      setOverlay(null);
      return;
    }
    if (dirty) setOverlay({ kind: "discard", nextDate: next });
    else applyDate(next);
  };
  const applySection = (next: Section) => {
    if (next !== section) {
      const nextFixture = next === "junior" ? juniorFixtures : fixtures;
      setSection(next);
      setMembers(nextFixture);
      setDate(initialDate);
      setEntries(seedEntries(nextFixture));
      setSaved({ [initialDate]: seedEntries(nextFixture) });
      setStatus("");
      setError("");
    }
    setOverlay(null);
  };
  const chooseSection = (next: Section) => {
    if (saving) return;
    if (next === section) {
      setOverlay(null);
      return;
    }
    if (dirty) setOverlay({ kind: "discard", nextSection: next });
    else applySection(next);
  };
  const save = () => {
    if (saving) return;
    const invalid = members.find((m) =>
      entryError(entries[m.id] || emptyEntry(), section),
    );
    if (invalid) {
      setMarksSquad("all");
      setError("Check the highlighted score.");
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLInputElement>(
            `input[data-member="${invalid.id}"][aria-invalid="true"]`,
          )
          ?.focus(),
      );
      return;
    }
    setSaving(true);
    setError("");
    setTimeout(() => {
      setSaving(false);
      if (offline) {
        setError("No connection. Your changes are still here.");
        return;
      }
      const normalized = Object.fromEntries(
        Object.entries(entries).map(([id, e]) => [
          id,
          e.attendance === "present"
            ? {
                ...e,
                score: e.score || "0",
                uniform: e.uniform || "0",
                behaviour: e.behaviour || "0",
              }
            : { ...e, score: "", uniform: "", behaviour: "" },
        ]),
      );
      setEntries(normalized);
      setSaved((s) => ({ ...s, [date]: normalized }));
      if (section === "company" && weeks.includes(date)) {
        const i = weeks.indexOf(date);
        setMembers((ms) =>
          ms.map((m) => {
            const e = normalized[m.id];
            const history = m.history.map((v, j) =>
              j !== i
                ? v
                : e.attendance === "present"
                  ? Number(e.score)
                  : e.attendance === "absent"
                    ? -1
                    : -2,
            );
            return {
              ...m,
              history,
              total:
                Math.round(
                  history.reduce((s, v) => s + Math.max(0, v), 0) * 100,
                ) / 100,
              attended: history.filter((v) => v >= 0).length,
            };
          }),
        );
      }
      setStatus("Saved just now");
    }, 450);
  };
  const saveMember = (
    value: Partial<RankedMember> & {
      name: string;
      year: number;
      squad: number;
      leader: boolean;
    },
    id?: string,
  ) => {
    const rank =
      section === "company" && value.year >= 11 ? value.rank : undefined;
    if (id)
      setMembers((ms) =>
        ms.map((m) => (m.id === id ? { ...m, ...value, rank } : m)),
      );
    else {
      const member = {
        ...value,
        rank,
        id: `demo-new-${Date.now()}`,
        history: Array(8).fill(-2),
        total: 0,
        attended: 0,
      };
      setMembers((ms) => [...ms, member]);
      setEntries((es) => ({ ...es, [member.id]: emptyEntry() }));
    }
    setOverlay(null);
  };
  const removeMember = (id: string) => {
    setMembers((ms) => ms.filter((m) => m.id !== id));
    setOverlay(null);
  };
  const clear = () => {
    setEntries(Object.fromEntries(members.map((m) => [m.id, emptyEntry()])));
    setStatus("");
    setOverlay(null);
  };
  return {
    role,
    section,
    members,
    date,
    entries,
    dirty,
    filtered,
    search,
    setSearch,
    mode,
    setMode,
    squad,
    setSquad,
    year,
    setYear,
    marksSquad,
    setMarksSquad,
    overlay,
    setOverlay,
    saving,
    status,
    error,
    unlocked,
    setUnlocked,
    locked: date < initialDate && !unlocked,
    offline,
    setOffline,
    motion,
    setMotion,
    solid,
    setSolid,
    week,
    setWeek,
    reportSquad,
    setReportSquad,
    changeEntry,
    chooseDate,
    applyDate,
    chooseSection,
    applySection,
    save,
    saveMember,
    removeMember,
    clear,
  };
}
export type Model = ReturnType<typeof useController>;
const Context = createContext<Model>(null!);
export const useModel = () => useContext(Context);
export function ModelProvider({ children }: { children: React.ReactNode }) {
  return (
    <Context.Provider value={useController()}>{children}</Context.Provider>
  );
}
export const initialScreen = (role: Role): Screen => {
  const p = params.get("page");
  return role === "boy"
    ? "home"
    : role === "leader"
      ? p === "settings"
        ? "settings"
        : "squad"
      : ["members", "marks", "squad", "settings"].includes(p || "")
        ? (p as Screen)
        : "members";
};
