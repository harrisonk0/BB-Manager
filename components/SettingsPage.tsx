import React, { useState, useEffect } from 'react';
import { Section, SectionSettings } from '../types';
import { saveSettings } from '../services/settings';
import { createAuditLog, generateInviteCode, fetchActiveInviteCode } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { ClipboardIcon, CheckIcon } from './Icons';

interface SettingsPageProps {
  activeSection: Section;
  currentSettings: SectionSettings | null;
  onSettingsSaved: (newSettings: SectionSettings) => void;
}

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const SettingsPage: React.FC<SettingsPageProps> = ({ activeSection, currentSettings, onSettingsSaved }) => {
  const [meetingDay, setMeetingDay] = useState<number>(5); // Default to Friday
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setMeetingDay(currentSettings.meetingDay);
    }
    const user = getAuthInstance().currentUser;
    if (user) {
        fetchActiveInviteCode(user.email!).then(code => {
            setInviteCode(code);
        });
    }
  }, [currentSettings]);

  const handleSave = async () => {
    if (!currentSettings || currentSettings.meetingDay === meetingDay) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const newSettings: SectionSettings = { meetingDay };
      
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      const oldDay = WEEKDAYS[currentSettings.meetingDay];
      const newDay = WEEKDAYS[meetingDay];

      await createAuditLog({
        userEmail,
        actionType: 'UPDATE_SETTINGS',
        description: `Updated meeting day from ${oldDay} to ${newDay}.`,
        revertData: { settings: currentSettings },
      }, activeSection);

      await saveSettings(activeSection, newSettings);
      onSettingsSaved(newSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("An error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateCode = async () => {
      setIsGenerating(true);
      const userEmail = getAuthInstance().currentUser?.email;
      if (!userEmail) {
          setError("User not found.");
          setIsGenerating(false);
          return;
      }
      try {
        const newCode = await generateInviteCode(userEmail);
        setInviteCode(newCode);
      } catch (err) {
        console.error("Failed to generate invite code:", err);
        setError("Could not generate invite code. Please try again.");
      } finally {
        setIsGenerating(false);
      }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (!currentSettings) {
    return <div className="text-center p-8">Loading settings...</div>;
  }

  const isCompany = activeSection === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
      
      <div className="max-w-2xl mx-auto space-y-6">
        {/* General Settings */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <div className="space-y-6">
            <div>
              <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>General Settings</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <label htmlFor="meeting-day" className="block text-md font-medium text-slate-700 mb-2 sm:mb-0">
                  Weekly Meeting Day
                </label>
                <select
                  id="meeting-day"
                  value={meetingDay}
                  onChange={(e) => setMeetingDay(parseInt(e.target.value, 10))}
                  className={`w-full sm:w-auto mt-1 sm:mt-0 block px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Set the default day for the Weekly Marks page.
              </p>
            </div>
            
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-28 ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Invite Officer */}
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <div className="space-y-6">
                <div>
                    <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Invite New Officer</h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Generate a one-time use code to invite another officer to create an account.
                    </p>
                    {inviteCode && (
                        <div className="mt-4 flex items-center space-x-2">
                            <input
                                type="text"
                                readOnly
                                value={inviteCode}
                                className="flex-grow px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm text-center font-mono tracking-widest sm:text-sm cursor-text"
                                aria-label="Invite Code"
                            />
                            <button onClick={handleCopyCode} className={`p-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentRing} ${copySuccess ? 'bg-green-100 border-green-300 text-green-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'}`}>
                                {copySuccess ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                    className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-48 ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                    {isGenerating ? 'Generating...' : inviteCode ? 'Generate New Code' : 'Generate Invite Code'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
