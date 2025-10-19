import React, { useState, useEffect, useCallback } from 'react';
import { fetchAuditLogs, createAuditLog, updateAuditLog, deleteBoyById, recreateBoy, updateBoy } from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { AuditLog, Boy } from '../types';
import { ClockIcon, PlusIcon, PencilIcon, TrashIcon, UndoIcon } from './Icons';
import Modal from './Modal';

interface AuditLogPageProps {
  refreshData: () => void;
}

const ACTION_ICONS: Record<string, React.FC<{className?: string}>> = {
  CREATE_BOY: PlusIcon,
  UPDATE_BOY: PencilIcon,
  DELETE_BOY: TrashIcon,
  REVERT_ACTION: UndoIcon,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_BOY: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300',
  UPDATE_BOY: 'bg-bb-blue/10 text-bb-blue',
  DELETE_BOY: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300',
  REVERT_ACTION: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-300',
};

const AuditLogPage: React.FC<AuditLogPageProps> = ({ refreshData }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [logToRevert, setLogToRevert] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedLogs = await fetchAuditLogs();
      setLogs(fetchedLogs);
    } catch (err) {
      console.error(err);
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleOpenRevertModal = (log: AuditLog) => {
    setLogToRevert(log);
  };

  const handleCloseRevertModal = () => {
    setLogToRevert(null);
  };

  const handleRevert = async () => {
    if (!logToRevert) return;

    setIsReverting(true);
    setError(null);

    try {
      const { actionType, revertData } = logToRevert;
      switch (actionType) {
        case 'CREATE_BOY':
          await deleteBoyById(revertData.boyId);
          break;
        case 'DELETE_BOY':
          await recreateBoy(revertData.boyData as Boy);
          break;
        case 'UPDATE_BOY':
          if (revertData.boyData) { // Single boy update
            await updateBoy(revertData.boyData as Boy);
          } else if (revertData.boysData) { // Batch update from weekly marks
            const updates = (revertData.boysData as Boy[]).map(boy => updateBoy(boy));
            await Promise.all(updates);
          }
          break;
        default:
          throw new Error('This action cannot be reverted.');
      }
      
      // Mark original log as reverted
      await updateAuditLog({ ...logToRevert, reverted: true });

      // Create a new log for the revert action
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      await createAuditLog({
        userEmail,
        actionType: 'REVERT_ACTION',
        description: `Reverted action: "${logToRevert.description}"`,
        revertData: {},
      });

      refreshData(); // Refresh main app data
      loadLogs(); // Refresh logs to show reverted status

    } catch (err: any) {
      console.error('Failed to revert action:', err);
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

  if (loading) return <div className="text-center p-8">Loading audit trail...</div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Audit Log</h1>

      {logs.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No actions recorded yet.</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Any changes you make will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {logs.map((log) => {
            const Icon = ACTION_ICONS[log.actionType] || PencilIcon;
            const colorClass = ACTION_COLORS[log.actionType] || 'bg-gray-100 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300';
            const canRevert = log.actionType !== 'REVERT_ACTION' && !log.reverted;

            return (
              <li key={log.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <span className={`flex-shrink-0 rounded-full p-2 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-md font-medium text-gray-800 dark:text-gray-200">{log.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <ClockIcon className="h-4 w-4" />
                      {formatTimestamp(log.timestamp)} by <strong>{log.userEmail}</strong>
                    </p>
                  </div>
                </div>
                {canRevert && (
                  <button
                    onClick={() => handleOpenRevertModal(log)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-bb-blue rounded-md hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bb-blue transition-colors"
                  >
                    <UndoIcon className="h-4 w-4" />
                    Revert
                  </button>
                )}
                {log.reverted && (
                    <span className="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md">Reverted</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={!!logToRevert} onClose={handleCloseRevertModal} title="Confirm Revert">
        {logToRevert && (
          <div className="space-y-4">
            <p>Are you sure you want to revert this action?</p>
            <p className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm italic">"{logToRevert.description}"</p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCloseRevertModal}
                disabled={isReverting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 dark:text-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleRevert}
                disabled={isReverting}
                className="px-4 py-2 text-sm font-medium text-white bg-bb-blue rounded-md hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bb-blue disabled:bg-bb-blue disabled:opacity-50 disabled:cursor-not-allowed"
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