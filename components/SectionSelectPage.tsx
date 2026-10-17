import React from "react";
import { Section } from "../types";
import { LogOutIcon } from "./Icons";
import { NativeButton } from "./ui";
import "./shell/staff-shell.css";
import { branding } from "./branding";

interface SectionSelectPageProps {
  onSelectSection: (section: Section) => void;
  onSignOut: () => void;
}

const SectionSelectPage: React.FC<SectionSelectPageProps> = ({
  onSelectSection,
  onSignOut,
}) => {
  return (
    <main className="bb-auth-page">
      <div className="bb-auth-content">
        <img
          src={branding.bbLogo}
          alt="The Boys’ Brigade"
          className="bb-auth-brand"
        />
        <h1 className="bb-auth-heading">Your workspace</h1>
        <p className="bb-auth-caption">Choose a section to manage</p>
        <div className="bb-auth-actions">
          <button
            className="bb-section-choice"
            onClick={() => onSelectSection("company")}
            aria-label="Manage Company Section"
          >
            <img src={branding.companyLogo} alt="" />
            <span>
              <strong>Company</strong>
              <small>School years 8–14</small>
            </span>
          </button>
          <button
            className="bb-section-choice"
            onClick={() => onSelectSection("junior")}
            aria-label="Manage Junior Section"
          >
            <img src={branding.juniorLogo} alt="" />
            <span>
              <strong>Junior</strong>
              <small>School years P4–P7</small>
            </span>
          </button>
          <NativeButton variant="plain" onClick={onSignOut}>
            <LogOutIcon className="h-5 w-5" />
            Sign out
          </NativeButton>
        </div>
      </div>
    </main>
  );
};
export default SectionSelectPage;
