import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type SetStateAction,
} from "react";
import { fetchBoys } from "../services/db";
import { getSettings } from "../services/settings";
import { Boy, Section, SectionSettings, ToastType } from "../types";

/**
 * Custom hook for managing core application data (boys, settings) and their synchronization.
 * Handles initial data loading, refreshing, and background sync.
 */
export const useAppData = (
  activeSection: Section | null,
  showToast: (message: string, type?: ToastType) => void,
  currentUser: any, // Supabase user type
) => {
  const [boys, setBoys] = useState<Boy[]>([]);
  const [settings, setSettings] = useState<SectionSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true); // New loading state for data
  const [dataError, setDataError] = useState<string | null>(null);

  // Invalidated synchronously during render as well as cleanup: a late response can
  // never populate a different principal's or section's mounted workspace.
  const identity = `${currentUser?.id || ""}:${activeSection || ""}`;
  const scope = useRef({ identity, generation: 0 });
  if (scope.current.identity !== identity) {
    scope.current = { identity, generation: scope.current.generation + 1 };
  }
  const owner = scope.current;
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  const refreshData = useCallback(async () => {
    if (!activeSection || !currentUser || scope.current !== owner)
      return;
    const request = ++owner.generation;
    const valid = () =>
      scope.current === owner && owner.generation === request;
    try {
      const [allBoys, sectionSettings] = await Promise.all([
        fetchBoys(activeSection),
        getSettings(activeSection),
      ]);
      if (!valid()) return;
      setBoys([...allBoys].sort((a, b) => a.name.localeCompare(b.name)));
      setSettings(sectionSettings);
      setDataError(null);
      setLoadedIdentity(identity);
    } catch (err: unknown) {
      if (valid()) {
        setLoadedIdentity(identity);
        setDataError(
          `Could not refresh data. Please check your connection. ${err instanceof Error ? err.message : ""}`,
        );
      }
    }
  }, [activeSection, currentUser?.id, identity, owner]);

  useEffect(() => {
    setBoys([]);
    setSettings(null);
    setDataError(null);
    if (!activeSection || !currentUser) {
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    void refreshData().finally(() => {
      if (!cancelled) setDataLoading(false);
    });
    return () => {
      cancelled = true;
      owner.generation += 1;
    };
  }, [identity, refreshData, owner]);

  const updateSettings = useCallback(
    (next: SetStateAction<SectionSettings | null>) => {
      // A completed save from an unmounted section/account must not replace current settings.
      if (scope.current === owner) setSettings(next);
    },
    [owner],
  );
  const ownsData = loadedIdentity === identity;
  return {
    boys: ownsData ? boys : [],
    settings: ownsData ? settings : null,
    dataLoading:
      Boolean(activeSection && currentUser && !ownsData) || dataLoading,
    dataError,
    refreshData,
    setSettings: updateSettings,
  };
};
