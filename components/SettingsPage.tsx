import React, { useState, useEffect, useCallback } from 'react';
import { Section, SectionSettings, Invite } from '../types';
import { saveSettings } from '../services/settings';
import { createAuditLog, generateInvite, fetchInvites, revokeInvite } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { TrashIcon, ClipboardIcon, CheckIcon } from './Icons';
import Modal from './Modal';

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

  const [inviteNote, setInviteNote] = useState('');
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setIsGenerating(true);
    
    const user = getAuthInstance().currentUser;
    if (!user) {
        setInviteError("You must be logged in to generate a link.");
        setIsGenerating(false);
        return;
    }
    
    try {
        const inviteId = await generateInvite(user.email!, inviteNote || undefined);
        const baseUrl = window.location.href.split('?')[0].split('#')[0];
        const link = `${baseUrl}?invite=${inviteId}`;
        setGeneratedLink(link);
        setInviteNote('');
        loadInvites();
    } catch (err: any) {
        setInviteError(`Failed to generate link: ${err.message}`);
        console.error(err);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    try {
        await revokeInvite(inviteId);
        loadInvites();
    } catch (err: any) {
        setInviteError(`Failed to revoke invite: ${err.message}`);
        console.error(err);
    }
  };
  
  const handleCopyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseLinkModal = () => {
    setGeneratedLink(null);
    setCopied(false);
  }


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
                        Generate a unique, single-use link to invite a new officer. Share this link with them to allow them to create an account.
                    </p>
                    <form onSubmit={handleGenerateLink} className="mt-4 flex flex-col sm:flex-row items-start sm:items-stretch gap-2">
                        <input
                            type="text"
                            value={inviteNote}
                            onChange={e => setInviteNote(e.target.value)}
                            placeholder="Add an optional note (e.g., for Jane D.)"
                            className={`flex-grow px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
                            aria-label="Optional note for invite"
                        />
                        <button
                            type="submit"
                            disabled={isGenerating}
                            className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white w-full sm:w-auto ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Invite Link'}
                        </button>
                    </form>
                    {inviteError && <p className="text-red-500 text-sm mt-2">{inviteError}</p>}
                </div>

                <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-md font-medium text-slate-800">Pending Invite Links</h3>
                    {pendingInvites.length === 0 ? (
                        <p className="text-sm text-slate-500 mt-2">No pending invitations.</p>
                    ) : (
                        <ul className="mt-2 space-y-2">
                            {pendingInvites.map(invite => (
                                <li key={invite.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                                    <span className="text-sm text-slate-700 italic truncate">{invite.note || 'No note'}</span>
                                    <button onClick={() => handleRevoke(invite.id)} className="p-1.5 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-200" aria-label={`Revoke invite for ${invite.note || 'link'}`}>
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
      
      <Modal isOpen={!!generatedLink} onClose={handleCloseLinkModal} title="Invite Link Generated">
        <div className="space-y-4">
            <p className="text-slate-600">Share this unique link with the new officer. It can only be used once.</p>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={generatedLink || ''}
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm text-slate-700"
                />
                 <button
                    onClick={handleCopyToClipboard}
                    className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md shadow-sm text-white ${copied ? 'bg-green-500' : accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'}`}
                    aria-label="Copy to clipboard"
                  >
                    {copied ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
                  </button>
            </div>
            <div className="flex justify-end pt-4">
                 <button
                    type="button"
                    onClick={handleCloseLinkModal}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                  >
                    Close
                  </button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default SettingsPage;