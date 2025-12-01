/**
 * @file AuditLogPage.tsx
 * @description This page displays a chronological list of all actions performed within the app.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAuditLogs, createAuditLog, deleteBoyById, recreateBoy, updateBoy, updateUserRole } from '../services/db';
import { saveSettings } from '../services/settings';
import { AuditLog, Boy, Section, SectionSettings, ToastType, UserRole, AuditLogActionType } from '../types';
import { ClockIcon, PlusIcon, PencilIcon, TrashIcon, UndoIcon, CogIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import Modal from './Modal';
import { Logger } from '../services/logger';

interface AuditLogPageProps {
  refreshData: () => void;
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
  userRole: UserRole | null;
  /** The encryption key derived from the user session. */
  encryptionKey: CryptoKey | null;
}

const ACTION_ICONS: Record<AuditLogActionType, React.FC<{className?: string}>> = {
  CREATE_BOY: PlusIcon,
  UPDATE_BOY: PencilIcon,
  DELETE_BOY: TrashIcon,
  REVERT_ACTION: UndoIcon,
  UPDATE_SETTINGS: CogIcon,
  UPDATE_USER_ROLE: CogIcon,
  DELETE_USER_ROLE: TrashIcon,
  APPROVE_USER: CheckCircleIcon,
  DENY_USER: XCircleIcon,
  PASSWORD_CHANGE: CogIcon,
  PASSWORD_RESET: UndoIcon,
  CLEAR_AUDIT_LOGS: TrashIcon,
  CLEAR_LOCAL_DATA: TrashIcon,
};

const AuditLogPage: React.FC<AuditLogPageProps> = ({ refreshData, activeSection, showToast, userRole, encryptionKey }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [logToRevert, setLogToRevert] = useState<AuditLog | null>(null);

  const isCompany = activeSection === 'company';
  
  const ACTION_COLORS: Record<AuditLogActionType, string> = {
    CREATE_BOY: 'bg-green-100 text-green-700',
    UPDATE_BOY: isCompany ? 'bg-company-blue/10 text-company-blue' : 'bg-junior-blue/10 text-junior-blue',
    UPDATE_SETTINGS: isCompany ? 'bg-company-blue/10 text-company-blue' : 'bg-junior-blue/10 text-junior-blue',
    DELETE_BOY: 'bg-red-100 text-red-700',
    REVERT_ACTION: 'bg-yellow-100 text-yellow-700',
    UPDATE_USER_ROLE: 'bg-purple-100 text-purple-700',
    DELETE_USER_ROLE: 'bg-red-100 text-red-700',
    APPROVE_USER: 'bg-green-100 text-green-700',
    DENY_USER: 'bg-red-100 text-red-700',
    PASSWORD_CHANGE: 'bg-purple-100 text-purple-700',
    PASSWORD_RESET: 'bg-yellow-100 text-yellow-700',
    CLEAR_AUDIT_LOGS: 'bg-red-100 text-red-700',
    CLEAR_LOCAL_DATA: 'bg-red-100 text-red-700',
  };

  const loadLogs = useCallback(async () => {
    if (!encryptionKey) {
        setError('Encryption key missing. Cannot load audit logs.');
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedLogs = await fetchAuditLogs(activeSection, encryptionKey);
      setLogs(fetchedLogs);
    } catch (err) {
      Logger.error("Failed to load audit logs", err);
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [activeSection, encryptionKey]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const handleLogsRefresh = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail.section === activeSection || customEvent.detail.section === null) {
            console.log('Audit log cache updated in background, refreshing UI...');
            loadLogs();
        }
    };

    window.addEventListener('logsrefreshed', handleLogsRefresh);
    return () => {
      window.removeEventListener('logsrefreshed', handleLogsRefresh);
    };
  }, [activeSection, loadLogs]);
  
  const revertedLogIds = useMemo(() => {
    return new Set(logs.filter(log => log.actionType === 'REVERT_ACTION' && log.revertedLogId).map(log => log.revertedLogId));
  }, [logs]);

  const handleOpenRevertModal = (log: AuditLog) => {
    setLogToRevert(log);
  };

  const handleCloseRevertModal = () => {
    setLogToRevert(null);
  };

  const handleRevert = async () => {
    if (!logToRevert || !encryptionKey) return;

    setIsReverting(true);
    setError(null);

    try {
      const { actionType, revertData } = logToRevert;
      
      switch (actionType) {
        case 'CREATE_BOY':
          await deleteBoyById(revertData.boyId, activeSection);
          break;
        case 'DELETE_BOY':
          await recreateBoy(revertData.boyData as Boy, activeSection, encryptionKey);
          break;
        case 'UPDATE_BOY':
          if (revertData.boyData) { 
            await updateBoy(revertData.boyData as Boy, activeSection, encryptionKey, false);
          } else if (revertData.boysData) { 
            const updates = (revertData.boysData as Boy[]).map(boy => updateBoy(boy, activeSection, encryptionKey, false));
            await Promise.all(updates);
          }
          break;
        case 'UPDATE_SETTINGS':
            await saveSettings(activeSection, revertData.settings as SectionSettings, userRole);
            break;
        case 'UPDATE_USER_ROLE':
            await updateUserRole(revertData.uid, revertData.oldRole as UserRole, revertData.oldSections as Section[], userRole, encryptionKey);
            break;
        case 'APPROVE_USER':
            await updateUserRole(revertData.uid, revertData.oldRole as UserRole, revertData.oldSections as Section[], userRole, encryptionKey);
            break;
        default:
          throw new Error('This action cannot be reverted.');
      }
      
      await createAuditLog({
        actionType: 'REVERT_ACTION',
        description: `Reverted action: "${logToRevert.description}"`,
        revertData: {}, 
        revertedLogId: logToRevert.id,
      }, logToRevert.section || null, encryptionKey); 
      
      showToast('Action reverted successfully.', 'success');
      refreshData();
      loadLogs();

    } catch (err: any) {
      Logger.error('Failed to revert action:', err);
      showToast(`Failed to revert: ${err.message}`, 'error');
      setError(`Failed to revert: ${err.message}`);
    } finally {
      setIsReverting(false);
      handleCloseRevertModal();
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const revertibleActionTypes: AuditLogActionType[] = [
    'CREATE_BOY',
    'DELETE_BOY',
    'UPDATE_BOY',
    'UPDATE_SETTINGS',
    'UPDATE_USER_ROLE',
    'APPROVE_USER',
  ];

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
            
            const hasBeenReverted = revertedLogIds.has(log.id);
            const canRevert = revertibleActionTypes.includes(log.actionType) && !hasBeenReverted;

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
                {hasBeenReverted && (
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