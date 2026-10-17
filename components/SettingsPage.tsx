import React, { useState, useEffect } from "react";
import { Boy, Section, SectionSettings, ToastType, UserRole } from "../types";
import { saveSettings } from "../services/settings";
import { startNewBbSession } from "../services/sessions";
import {
  getDefaultClosedSessionLabel,
  NEW_SESSION_CONFIRMATION_PHRASE,
} from "../services/sessionArchiveModel";
import Modal from "./Modal";
import SquadsSettingsCard from "./SquadsSettingsCard";
import {
  NativeButton,
  NativeField,
  NativeInput,
  GroupedList,
  SettingsRow,
  InlineNotice,
} from "./ui";
import "./reporting/reporting.css";

interface SettingsPageProps {
  activeSection: Section;
  currentSettings: SectionSettings | null;
  /** Callback to update the settings state in the parent App component. */
  onSettingsSaved: (newSettings: SectionSettings) => void;
  showToast: (message: string, type?: ToastType) => void;
  /** The role of the currently logged-in user. */
  userRole: UserRole | null;
  /** Callback to navigate to the account settings page. */
  onNavigateToAccountSettings: () => void;
  /** Reload the live roster after a session is archived. */
  refreshData: () => Promise<void>;
  /** Open the Past Sessions page after a successful archive. */
  onNavigateToArchives: () => void;
  /** Live members in this section, used to block deleting occupied squads. */
  boys: Boy[];
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SettingsPage: React.FC<SettingsPageProps> = ({
  activeSection,
  currentSettings,
  onSettingsSaved,
  showToast,
  userRole,
  onNavigateToAccountSettings,
  refreshData,
  onNavigateToArchives,
  boys,
}) => {
  const [meetingDay, setMeetingDay] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState(
    getDefaultClosedSessionLabel,
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [pdfAcknowledged, setPdfAcknowledged] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const canEditSettings = userRole && ["admin", "captain"].includes(userRole);
  useEffect(() => {
    if (currentSettings) {
      setMeetingDay(currentSettings.meetingDay);
    }
  }, [currentSettings]);

  const handleSaveSettings = async () => {
    if (!currentSettings || currentSettings.meetingDay === meetingDay) {
      showToast("No changes to save.", "info");
      return;
    }
    if (!canEditSettings) {
      showToast(
        "Permission denied: You do not have permission to save settings.",
        "error",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const newSettings: SectionSettings = {
        meetingDay,
        squads: currentSettings.squads,
      };
      await saveSettings(activeSection, newSettings, userRole);
      onSettingsSaved(newSettings);
      showToast("Settings saved successfully!", "success");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      showToast(`Failed to save settings: ${err.message}`, "error");
      setError("An error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeConfirmModal = () => {
    if (isStartingSession) return;
    setIsConfirmOpen(false);
    setConfirmationText("");
    setPdfAcknowledged(false);
  };

  const handleStartNewSession = async () => {
    if (!canEditSettings) {
      showToast(
        "Permission denied: only captains and admins can start a new BB session.",
        "error",
      );
      return;
    }

    const trimmedLabel = sessionLabel.trim();
    if (!trimmedLabel) {
      showToast("Enter a label for the session you are closing.", "error");
      return;
    }

    if (
      confirmationText.trim() !== NEW_SESSION_CONFIRMATION_PHRASE ||
      !pdfAcknowledged
    ) {
      return;
    }

    setIsStartingSession(true);
    try {
      const result = await startNewBbSession(trimmedLabel);
      await refreshData();
      setIsConfirmOpen(false);
      setConfirmationText("");
      setPdfAcknowledged(false);
      setSessionLabel(getDefaultClosedSessionLabel());
      showToast(
        `Archived ${result.label}: ${result.memberCount} members and ${result.markCount} marks. The live roster is now empty.`,
        "success",
      );
      onNavigateToArchives();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to start a new BB session.";
      showToast(message, "error");
    } finally {
      setIsStartingSession(false);
    }
  };

  const canConfirmStart =
    confirmationText.trim() === NEW_SESSION_CONFIRMATION_PHRASE &&
    pdfAcknowledged &&
    !isStartingSession;

  return (
    <div className="bb-reports bb-form-container">
      <section className="bb-report-section">
        <h2>Weekly meeting</h2>
        <div className="bb-form-surface">
          <NativeField
            label="Meeting day"
            htmlFor="meeting-day"
            hint="Used as the default date on Weekly Marks."
          >
            <select
              id="meeting-day"
              value={meetingDay}
              disabled={!canEditSettings || isSaving}
              onChange={(event) => setMeetingDay(Number(event.target.value))}
            >
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </NativeField>
          {error && <InlineNotice kind="error">{error}</InlineNotice>}
          <div className="bb-report-actions">
            <NativeButton
              onClick={handleSaveSettings}
              disabled={
                !canEditSettings ||
                !currentSettings ||
                meetingDay === currentSettings.meetingDay
              }
              busy={isSaving}
            >
              Save meeting day
            </NativeButton>
          </div>
        </div>
      </section>
      {currentSettings && (
        <SquadsSettingsCard
          activeSection={activeSection}
          currentSettings={currentSettings}
          boys={boys}
          userRole={userRole}
          canEdit={!!canEditSettings}
          onSettingsSaved={onSettingsSaved}
          showToast={showToast}
        />
      )}
      <GroupedList title="Your account">
        <SettingsRow
          title="Account & security"
          detail="Password, passkeys and account settings"
          onClick={onNavigateToAccountSettings}
        />
      </GroupedList>
      {canEditSettings && (
        <section className="bb-report-section">
          <h2>Session administration</h2>
          <div className="bb-form-surface">
            <p className="bb-report-intro">
              Archive Company and Junior members and marks together, then open
              empty rosters for the next year. Meeting days, staff accounts and
              past sessions stay unchanged.
            </p>
            <InlineNotice>
              Download Master PDFs from Dashboard for both sections first if you
              need a live copy. Archived data remains in Past Sessions.
            </InlineNotice>
            <NativeInput
              id="session-label"
              label="Session you are closing"
              maxLength={80}
              value={sessionLabel}
              onChange={(event) => setSessionLabel(event.target.value)}
              disabled={isStartingSession}
            />
            <NativeButton
              danger
              variant="secondary"
              onClick={() => setIsConfirmOpen(true)}
              disabled={!sessionLabel.trim() || isStartingSession}
            >
              Start new BB session
            </NativeButton>
          </div>
        </section>
      )}
      <Modal
        isOpen={isConfirmOpen}
        dismissible={!isStartingSession}
        onClose={closeConfirmModal}
        title="Start a new BB session?"
        size="lg"
      >
        <div className="bb-reports">
          <InlineNotice kind="error">
            This archives{" "}
            <strong>{sessionLabel.trim() || "the current session"}</strong> for
            both Company and Junior, then removes the live working copies. This
            cannot be undone from the app.
          </InlineNotice>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Every live member and mark in both sections is copied into Past
              Sessions.
            </li>
            <li>
              Members, Weekly Marks and Dashboard for both sections become
              empty.
            </li>
            <li>Only captains and administrators can run this action.</li>
          </ul>
          <label className="bb-check-row">
            <input
              type="checkbox"
              checked={pdfAcknowledged}
              disabled={isStartingSession}
              onChange={(event) => setPdfAcknowledged(event.target.checked)}
            />
            <span>
              I have downloaded Master PDFs if I need a live copy, or I am happy
              to use Past Sessions instead.
            </span>
          </label>
          <NativeInput
            label={`Type ${NEW_SESSION_CONFIRMATION_PHRASE} to confirm`}
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            autoComplete="off"
            disabled={isStartingSession}
          />
          <div className="bb-report-actions">
            <NativeButton
              variant="secondary"
              onClick={closeConfirmModal}
              disabled={isStartingSession}
            >
              Cancel
            </NativeButton>
            <NativeButton
              danger
              onClick={() => void handleStartNewSession()}
              disabled={!canConfirmStart}
              busy={isStartingSession}
            >
              {isStartingSession ? "Archiving…" : "Archive and start fresh"}
            </NativeButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default SettingsPage;
