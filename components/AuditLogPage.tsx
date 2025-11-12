/**
 * @file AuditLogPage.tsx
 * @description This page displays a chronological list of all actions performed within the app.
 * It provides a history of changes for accountability and includes the crucial functionality
 * to revert most actions, such as accidental deletions or incorrect mark updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs, createAuditLog, updateAuditLog, deleteBoyById, recreateBoy, updateBoy } from '../services/db';
import { saveSettings } from '../services/settings';
import { getAuthInstance } from '../services/firebase';
import { AuditLog, Boy, Section, SectionSettings, ToastType } from '../types';
import { ClockIcon, PlusIcon, PencilIcon, TrashIcon, UndoIcon, CogIcon } from './Icons';
import Modal from './Modal';

interface AuditLogPageProps {
  refreshData: () => void;
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
}

// A mapping of action types to their corresponding icons for visual representation.
const ACTION_ICONS: Record<string, React.FC<{className?: string}>> = {
  CREATE_BOY: PlusIcon,
  UPDATE_BOY: PencilIcon,
  DELETE_BOY: TrashIcon,
  REVERT_ACTION: UndoIcon,
  UPDATE_SETTINGS: CogIcon,
};

const AuditLogPage: React.FC<AuditLogPageProps> = ({ refreshData, activeSection, showToast }) => {
  // --- STATE MANAGEMENT ---
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [logToRevert, setLogToRevert] = useState<AuditLog | null>(null);

  const isCompany = activeSection === 'company';
  
  // A mapping of action types to color styles for visual distinction.
  const ACTION_COLORS: Record<string, string> = {
    CREATE_BOY: 'bg-green-100 text-green-700',
    UPDATE_BOY: isCompany ? 'bg-company-blue/10 text-company-blue' : 'bg-junior-blue/10 text-junior-blue',
    UPDATE_SETTINGS: isCompany ? 'bg-company-blue/10 text-company-blue' : 'bg-junior-blue/10 text-junior-blue',
    DELETE_BOY: 'bg-red-100 text-red-700',
    REVERT_ACTION: 'bg-yellow-100 text-yellow-700',
  };

  /**
   * Fetches the audit logs for the active section from the database.
   */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedLogs = await fetchAuditLogs(activeSection);
      setLogs(fetchedLogs);
    } catch (err) {
      console.error(err);
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  // Load logs on component mount or when the section changes.
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /**
   * EFFECT: Listens for the custom 'logsrefreshed' event.
   * This is triggered by the background sync in services/db.ts. When the local
   * audit logs are updated, this effect triggers a refresh of the page.
   */
  useEffect(() => {
    const handleLogsRefresh = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail.section === activeSection) {
            console.log('Audit log cache updated in background, refreshing UI...');
            loadLogs();
        }
    };

    window.addEventListener('logsrefreshed', handleLogsRefresh);
    return () => {
      window.removeEventListener('logsrefreshed', handleLogsRefresh);
    };
  }, [activeSection, loadLogs]);
  
  // --- EVENT HANDLERS ---
  const handleOpenRevertModal = (log: AuditLog) => {
    setLogToRevert(log);
  };

  const handleCloseRevertModal = () => {
    setLogToRevert(null);
  };

  /**
   * The core logic for reverting an action. This is a critical and powerful feature.
   * It uses the `revertData` stored in the original log to restore the application's
   * state to what it was before the action occurred.
   */
  const handleRevert = async () => {
    if (!logToRevert) return;

    setIsReverting(true);
    setError(null);

    try {
      const { actionType, revertData } = logToRevert;
      
      // Determine the correct "undo" operation based on the original action type.
      switch (actionType) {
        case 'CREATE_BOY':
          // To revert a creation, we delete the boy using the ID saved in `revertData`.
          await deleteBoyById(revertData.boyId, activeSection);
          break;
        case 'DELETE_BOY':
          // To revert a deletion, we recreate the boy using the full boy object saved in `revertData`.
          await recreateBoy(revertData.boyData as Boy, activeSection);
          break;
        case 'UPDATE_BOY':
          // To revert an update, we update the boy(s) again, but with the old data saved in `revertData`.
          if (revertData.boyData) { // Handle single boy update.
            await updateBoy(revertData.boyData as Boy, activeSection);
          } else if (revertData.boysData) { // Handle batch update from weekly marks.
            const updates = (revertData.boysData as Boy[]).map(boy => updateBoy(boy, activeSection));
            await Promise.all(updates);
          }
          break;
        case 'UPDATE_SETTINGS':
            // To revert a settings change, we save the old settings object.
            await saveSettings(activeSection, revertData.settings as SectionSettings);
            break;
        default:
          throw new Error('This action cannot be reverted.');
      }
      
      // After successfully reverting, perform cleanup and logging.
      
      // 1. Mark the original log entry as 'reverted' so it can't be reverted again.
      await updateAuditLog({ ...logToRevert, reverted: true }, activeSection);

      // 2. Create a new log entry for the revert action itself.
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      await createAuditLog({
        userEmail,
        actionType: 'REVERT_ACTION',
        description: `Reverted action: "${logToRevert.description}"`,
        revertData: {}, // Revert actions cannot be reverted.
      }, activeSection);
      
      showToast('Action reverted successfully.', 'success');
      // 3. Refresh the main application data and the audit log list.
      refreshData();
      loadLogs();

    } catch (err: any) {
      console.error('Failed to revert action:', err);
      showToast(`Failed to revert: ${err.message}`, 'error');
      setError(`Failed to revert: ${err.message}`);
    } finally {
      setIsReverting(false);
      handleCloseRevertModal();
    }
  };
  
  // --- UTILITY FUNCTIONS ---
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // --- RENDER LOGIC ---
  if (loading) return <div className="text-center p-8">Loading audit trail...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
  
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentRing = isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue';
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Audit Log</h1>

      {logs.length === 0 ? (
        <div className="text-center py-10 px-6 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-slate-900">No actions recorded yet.</h3>
          <p className="mt-1 text-sm text-slate-500">Any changes you make will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {logs.map((log) => {
            const Icon = ACTION_ICONS[log.actionType] || PencilIcon;
            const colorClass = ACTION_COLORS[log.actionType] || 'bg-slate-100 text-slate-600';
            const canRevert = log.actionType !== 'REVERT_ACTION' && !log.reverted;

            return (
              <li key={log.id} className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <span className={`flex-shrink-0 rounded-full p-2 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-md font-medium text-slate-800">{log.description}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <ClockIcon className="h-4 w-4" />
                      {formatTimestamp(log.timestamp)} by <strong className="text-slate-600">{log.userEmail}</strong>
                    </p>
                  </div>
                </div>
                {canRevert && (
                  <button
                    onClick={() => handleOpenRevertModal(log)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${accentBg} ${accentRing}`}
                  >
                    <UndoIcon className="h-4 w-4" />
                    Revert
                  </button>
                )}
                {log.reverted && (
                    <span className="px-3 py-1.5 text-sm font-medium text-slate-500 bg-slate-100 rounded-md">Reverted</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={!!logToRevert} onClose={handleCloseRevertModal} title="Confirm Revert">
        {logToRevert && (
          <div className="space-y-4">
            <p className="text-slate-600">Are you sure you want to revert this action?</p>
            <p className="p-3 bg-slate-100 rounded-md text-sm italic">"{logToRevert.description}"</p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseRevertModal}
                disabled={isReverting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleRevert}
                disabled={isReverting}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${accentBg} ${accentRing} disabled:bg-opacity-50`}
              >
                {isReverting ? 'Reverting...' : 'Confirm Revert'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogPage;