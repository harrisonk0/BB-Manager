import React, { useState, useEffect, useCallback } from 'react';
import { Section, SectionSettings, Invite } from '../types';
import { saveSettings } from '../services/settings';
import { createAuditLog, inviteOfficer, fetchInvites, revokeInvite } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { TrashIcon } from './Icons';

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

  const [inviteEmail, setInviteEmail] = useState('');
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
      fetchInvites().then(setPendingInvites).catch(() => setInviteError("Could not load pending invites."));
  }, []);

  useEffect(() => {
    if (currentSettings) {
      setMeetingDay(currentSettings.meetingDay);
    }
    loadInvites();
  }, [currentSettings, loadInvites]);

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteEmail.trim()) {
        setInviteError("Email cannot be empty.");
        return;
    }
    
    setIsInviting(true);
    const user = getAuthInstance().currentUser;
    if (!user) {
        setInviteError("You must be logged in to invite users.");
        setIsInviting(false);
        return;
    }
    
    try {
        await inviteOfficer(inviteEmail, user.email!);
        setInviteEmail('');
        loadInvites();
    } catch (err: any) {
        setInviteError(`Failed to send invite: ${err.message}`);
        console.error(err);
    } finally {
        setIsInviting(false);
    }
  };

  const handleRevoke = async (email: string) => {
    try {
        await revokeInvite(email);
        loadInvites();
    } catch (err: any) {
        setInviteError(`Failed to revoke invite: ${err.message}`);
        console.error(err);
    }
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
                        Enter the email address of the officer you wish to invite. They will then be able to create an account.
                    </p>
                    <form onSubmit={handleInvite} className="mt-4 flex flex-col sm:flex-row items-start sm:items-stretch gap-2">
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            placeholder="new.officer@example.com"
                            className={`flex-grow px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
                            aria-label="New officer email"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isInviting}
                            className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-full sm:w-auto ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isInviting ? 'Sending...' : 'Send Invite'}
                        </button>
                    </form>
                    {inviteError && <p className="text-red-500 text-sm mt-2">{inviteError}</p>}
                </div>

                <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-md font-medium text-slate-800">Pending Invites</h3>
                    {pendingInvites.length === 0 ? (
                        <p className="text-sm text-slate-500 mt-2">No pending invitations.</p>
                    ) : (
                        <ul className="mt-2 space-y-2">
                            {pendingInvites.map(invite => (
                                <li key={invite.email} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                                    <span className="text-sm text-slate-700 truncate">{invite.email}</span>
                                    <button onClick={() => handleRevoke(invite.email)} className="p-1.5 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-200" aria-label={`Revoke invite for ${invite.email}`}>
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;