import { useState, useCallback } from "react";
import { Section, View } from "../types";
import {
  clearStoredSection,
  readStoredSection,
  writeStoredSection,
} from "./sectionStorage";

export const useSectionManagement = (setView: (view: View) => void) => {
  const [activeSection, setActiveSection] = useState<Section | null>(() =>
    readStoredSection(),
  );

  const resetWorkspaceAddress = () => {
    // A new protected workspace has no previous page stack. Sanitize its incoming
    // address before Framework7 mounts, just as at the principal/logout boundary.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search + "#!/home/",
    );
  };
  const handleSelectSection = useCallback(
    (section: Section) => {
      resetWorkspaceAddress();
      writeStoredSection(section);
      setActiveSection(section);
      setView({ page: "home" });
    },
    [setView],
  );

  const performSwitchSection = useCallback(() => {
    resetWorkspaceAddress();
    clearStoredSection();
    setActiveSection(null);
    setView({ page: "home" });
  }, [setView]);

  return {
    activeSection,
    setActiveSection,
    handleSelectSection,
    performSwitchSection,
  };
};
