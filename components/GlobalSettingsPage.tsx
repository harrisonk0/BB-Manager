"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Section, ToastType, InviteCode, UserRole, AuditLogActionType } from '../types';
import { 
  createAuditLog, 
  createInviteCode, 
  fetchAllInviteCodes, 
  fetchAllUserRoles, 
  updateUserRole, 
  revokeInviteCode,
  clearAllAuditLogs,
  clearAllUsedRevokedInviteCodes,
  clearAllLocalData
} from '../services/db';
import { getAuthInstance } from '../services/firebase';
import { ClipboardIcon } from './Icons';
import Modal from './Modal'; // Corrected import path

interface GlobalSettingsPageProps {
  activeSection: Section; // Still needed for audit logging and clear local data
  showToast: (message: string, type?: ToastType) => void;
  userRole: UserRole | null;
  refreshData: () => void; // To refresh data in App.tsx after destructive actions
}

interface UserWithEmailAndRole {
  uid: string;
  email: string;
  role: UserRole;
}

const USER_ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  'admin': 'Administrator',
  'captain': 'Company Captain',
  'officer': 'Officer',
};

const ROLE_SORT_ORDER: UserRole[] = ['admin', 'captain', 'officer'];

const GlobalSettingsPage: React.FC<GlobalSettingsPageProps> = ({ activeSection, showToast, userRole, refreshData }) => {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loadingInviteCodes, setLoadingInviteCodes] = useState(true);
  const [codeToRevoke, setCodeToRevoke] = useState<InviteCode | null>(null);

  const [usersWithRoles, setUsersWithRoles] = useState<UserWithEmailAndRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [userToEditRole, setUserToEditRole] = useState<UserWithEmailAndRole | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole | ''>('');
  const [roleEditError, setRoleEditError] = useState<string | null>(null);

  // State for development controls confirmation modals
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [isClearInviteCodesModalOpen, setIsClearInviteCodesModalOpen] = useState(false);
  const [isClearLocalDataModalOpen, setIsClearLocalDataModalOpen] = useState(false);
  const [isClearingDevData, setIsClearingDevData] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Used for revoke code and save role

  const canManageInviteCodes = userRole && ['admin', 'captain'].includes(userRole);
  const canManageUserRoles = userRole && ['admin', 'captain'].includes(userRole);
  const isAdmin = userRole === 'admin';

  const loadInviteCodes = useCallback(async (showSpinner: boolean = true) => {
    if (!canManageInviteCodes) {
        setInviteCodes([]);
        setLoadingInviteCodes(false);
        return;
    }
    if (showSpinner) {
      setLoadingInviteCodes(true);
    }
    try {
      const codes = await fetchAllInviteCodes(userRole);
      setInviteCodes(codes);
    } catch (err) {
      console.error("Failed to load invite codes:", err);
      showToast("Failed to load invite codes.", "error");
    } finally {
      if (showSpinner) {
        setLoadingInviteCodes(false);
      }
    }
  }, [showToast, canManageInviteCodes, userRole]);

  useEffect(() => {
    loadInviteCodes();
  }, [loadInviteCodes, userRole]);

  useEffect(() => {
    const handleInviteCodesRefresh = () => {
      console.log('Invite codes cache updated in background, refreshing UI...');
      loadInviteCodes(false);
    };

    window.addEventListener('inviteCodesRefreshed', handleInviteCodesRefresh);
    return () => {
      window.removeEventListener('inviteCodesRefreshed', handleInviteCodesRefresh);
    };
  }, [loadInviteCodes]);

  const loadUsersWithRoles = useCallback(async () => {
    if (!canManageUserRoles) {
      setUsersWithRoles([]);
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    try {
      const fetchedUsers = await fetchAllUserRoles(userRole);
      fetchedUsers.sort((a, b) => {
        const roleAIndex = ROLE_SORT_ORDER.indexOf(a.role);
        const roleBIndex = ROLE_SORT_ORDER.indexOf(b.role);
        return roleAIndex - roleBIndex;
      });
      setUsersWithRoles(fetchedUsers);
    } catch (err: any) {
      console.error("Failed to load users with roles:", err);
      showToast(`Failed to load user roles: ${err.message}`, 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [canManageUserRoles, userRole, showToast]);

  useEffect(() => {
    loadUsersWithRoles();
  }, [loadUsersWithRoles, userRole]);

  const handleGenerateCode = async () => {
    if (!canManageInviteCodes) {
        showToast('Permission denied: You do not have permission to generate invite codes.', 'error');
        return;
    }
    setIsGeneratingCode(true);
    setGeneratedCode(null);
    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';

      const newInviteCode: Omit<InviteCode, 'id' | 'generatedAt' | 'defaultUserRole' | 'expiresAt'> = {
        generatedBy: userEmail,
        isUsed: false,
        section: activeSection,
      };

      const createdCode = await createInviteCode(newInviteCode, activeSection, userRole);
      await createAuditLog({
        userEmail,
        actionType: 'GENERATE_INVITE_CODE',
        description: `Generated new invite code: ${createdCode.id}`,
        revertData: { inviteCodeId: createdCode.id },
      }, activeSection);

      setGeneratedCode(createdCode.id);
      showToast('Invite code generated successfully!', 'success');
      loadInviteCodes();
    } catch (err: any) {
      console.error("Failed to generate invite code:", err);
      showToast(`Failed to generate invite code: ${err.message}`, 'error');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      showToast('Invite code copied to clipboard!', 'info');
    }).catch(err => {
      console.error("Failed to copy code:", err);
      showToast('Failed to copy code.', 'error');
    });
  };

  const handleRevokeClick = (code: InviteCode) => {
    setCodeToRevoke(code);
  };

  const confirmRevokeCode = async () => {
    if (!codeToRevoke) return;

    setIsSaving(true);
    try {
      await revokeInviteCode(codeToRevoke.id, activeSection, true, userRole);
      showToast(`Invite code '${codeToRevoke.id}' revoked successfully.`, 'success');
      loadInviteCodes();
      setCodeToRevoke(null);
    } catch (err: any) {
      console.error("Failed to revoke invite code:", err);
      showToast(`Failed to revoke invite code: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRoleClick = (user: UserWithEmailAndRole) => {
    setUserToEditRole(user);
    setSelectedNewRole(user.role);
    setRoleEditError(null);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!userToEditRole || !selectedNewRole) return;

    setRoleEditError(null);
    setIsSaving(true);

    try {
      await updateUserRole(userToEditRole.uid, selectedNewRole, userRole);
      showToast(`Role for ${userToEditRole.email} updated to ${USER_ROLE_DISPLAY_NAMES[selectedNewRole]}.`, 'success');
      loadUsersWithRoles();
      setIsRoleModalOpen(false);
    } catch (err: any) {
      console.error("Failed to update user role:", err);
      setRoleEditError(err.message || "Failed to update role. Please try again.");
      showToast('Failed to update user role.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Development Controls Handlers ---
  const handleClearAllAuditLogs = async () => {
    setIsClearingDevData(true);
    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      await clearAllAuditLogs(activeSection, userEmail, userRole);
      showToast('All audit logs cleared successfully!', 'success');
      // Trigger a refresh of the audit log page if it's currently viewed
      window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section: activeSection } }));
    } catch (err: any) {
      console.error("Failed to clear audit logs:", err);
      showToast(`Failed to clear audit logs: ${err.message}`, 'error');
    } finally {
      setIsClearingDevData(false);
      setIsClearLogsModalOpen(false);
    }
  };

  const handleClearAllUsedRevokedInviteCodes = async () => {
    setIsClearingDevData(true);
    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      await clearAllUsedRevokedInviteCodes(userEmail, userRole);
      showToast('All used/revoked invite codes cleared successfully!', 'success');
      loadInviteCodes(); // Refresh the invite codes list
    } catch (err: any) {
      console.error("Failed to clear invite codes:", err);
      showToast(`Failed to clear invite codes: ${err.message}`, 'error');
    } finally {
      setIsClearingDevData(false);
      setIsClearInviteCodesModalOpen(false);
    }
  };

  const handleClearAllLocalData = async () => {
    setIsClearingDevData(true);
    try {
      const auth = getAuthInstance();
      const userEmail = auth.currentUser?.email || 'Unknown User';
      await clearAllLocalData(activeSection, userEmail, userRole);
      showToast('All local data cleared successfully! Please refresh the page.', 'success');
      // Force a full page refresh to reload all data from scratch
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to clear local data:", err);
      showToast(`Failed to clear local data: ${err.message}`, 'error');
    } finally {
      setIsClearingDevData(false);
      setIsClearLocalDataModalOpen(false);
    }
  };
  
  const isCompany = activeSection === 'company';
  const accentRing = isCompany ? 'focus:ring-company-blue focus:border-company-blue' : 'focus:ring-junior-blue focus:border-junior-blue';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentText = isCompany ? 'text-company-blue' : 'text-junior-blue';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Global Settings</h1>
      
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Invite Code Generation Section */}
        {canManageInviteCodes && (
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Invite New Users</h2>
            <p className="text-slate-600 mb-4">Generate a one-time-use code to invite new users to the app. Share this code with them so they can sign up. Codes expire after 24 hours.</p>
            
            <button
                onClick={handleGenerateCode}
                disabled={isGeneratingCode}
                className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${accentBg} hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCompany ? 'focus:ring-company-blue' : 'focus:ring-junior-blue'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isGeneratingCode ? 'Generating...' : 'Generate New Invite Code'}
            </button>

            {generatedCode && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-slate-800 text-sm break-all">{generatedCode}</span>
                <button
                    onClick={() => copyCodeToClipboard(generatedCode)}
                    className="p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                    aria-label="Copy invite code to clipboard"
                >
                    <ClipboardIcon className="h-5 w-5" />
                </button>
                </div>
            )}

            <h3 className="text-lg font-semibold text-slate-700 mt-8 mb-3">Existing Invite Codes</h3>
            {loadingInviteCodes ? (
                <p className="text-slate-500">Loading codes...</p>
            ) : inviteCodes.length === 0 ? (
                <p className="text-slate-500">No active invite codes generated yet.</p>
            ) : (
                <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {inviteCodes.map(code => {
                    const isExpired = code.expiresAt < Date.now();
                    const statusText = code.isUsed ? 'Used' : (code.revoked ? 'Revoked' : (isExpired ? 'Expired' : 'Active'));
                    const statusColor = code.isUsed || code.revoked || isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
                    const codeClasses = code.isUsed || code.revoked || isExpired ? 'line-through text-slate-500' : '';

                    return (
                    <li key={code.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="flex-1">
                        <span className={`font-mono text-slate-800 ${codeClasses}`}>{code.id}</span>
                        <p className="text-xs text-slate-500 mt-1">
                        Generated by {code.generatedBy} on {code.generatedAt && !isNaN(code.generatedAt) ? new Date(code.generatedAt).toLocaleDateString() : 'N/A'}
                        {code.isUsed && code.usedAt && !isNaN(code.usedAt) && ` (Used by ${code.usedBy || 'Unknown'} on ${new Date(code.usedAt).toLocaleDateString()})`}
                        {!code.isUsed && !code.revoked && code.expiresAt && !isNaN(code.expiresAt) && ` (Expires ${new Date(code.expiresAt).toLocaleDateString()} ${new Date(code.expiresAt).toLocaleTimeString()})`}
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor}`}>{statusText}</span>
                        {!code.isUsed && !code.revoked && !isExpired && (
                            <button
                                onClick={() => handleRevokeClick(code)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                disabled={isSaving}
                            >
                                Revoke
                            </button>
                        )}
                    </div>
                    </li>
                )})}
                </ul>
            )}
            </div>
        )}

        {/* User Role Management Section */}
        {canManageUserRoles && (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>User Role Management</h2>
            <p className="text-slate-600 mb-4">View and manage roles for all users in the application. Ensure users have an assigned role to log in.</p>

            {loadingUsers ? (
              <p className="text-slate-500">Loading users...</p>
            ) : usersWithRoles.length === 0 ? (
              <p className="text-slate-500">No users found with assigned roles. Roles must be manually created in Firestore for new users.</p>
            ) : (
              <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {usersWithRoles.map(user => (
                  <li key={user.uid} className="p-3 flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium text-slate-800">{user.email}</span>
                      <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">{USER_ROLE_DISPLAY_NAMES[user.role]}</span></p>
                    </div>
                    <button
                      onClick={() => handleEditRoleClick(user)}
                      className={`px-3 py-1.5 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentBg} ${accentRing}`}
                    >
                      Edit Role
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Development Controls Section (Admin Only) */}
        {isAdmin && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-red-800 border-b border-red-300 pb-2 mb-4">Development Controls (Admin Only)</h2>
            <p className="text-red-700 mb-4">
              <strong className="font-bold">Warning:</strong> These actions are destructive and intended for development or testing purposes only. Use with extreme caution.
            </p>
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => setIsClearLogsModalOpen(true)}
                  disabled={isClearingDevData}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All Audit Logs (Current Section)
                </button>
                <p className="mt-1 text-xs text-red-700">Deletes all audit logs for the current section from Firestore and local storage.</p>
              </div>
              <div>
                <button
                  onClick={() => setIsClearInviteCodesModalOpen(true)}
                  disabled={isClearingDevData}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All Used/Revoked Invite Codes
                </button>
                <p className="mt-1 text-xs text-red-700">Deletes all used or revoked invite codes from Firestore and local storage.</p>
              </div>
              <div>
                <button
                  onClick={() => setIsClearLocalDataModalOpen(true)}
                  disabled={isClearingDevData}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All Local Data (Current Section & Global Invite Codes)
                </button>
                <p className="mt-1 text-xs text-red-700">Deletes all local data (boys, audit logs, pending writes, all invite codes, and all user roles) for the current section from your browser's IndexedDB. Requires page refresh.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role Edit Modal */}
      <Modal isOpen={!!isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Edit User Role">
        {userToEditRole && (
          <div className="space-y-4">
            <p className="text-slate-600">Editing role for: <strong className="font-semibold text-slate-800">{userToEditRole.email}</strong></p>
            {roleEditError && <p className="text-red-500 text-sm">{roleEditError}</p>}
            <div>
              <label htmlFor="new-role" className="block text-sm font-medium text-slate-700">New Role</label>
              <select
                id="new-role"
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
              >
                {Object.entries(USER_ROLE_DISPLAY_NAMES).map(([roleValue, displayName]) => (
                  <option key={roleValue} value={roleValue}>{displayName}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={isSaving}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${accentBg} ${accentRing}`}
              >
                {isSaving ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Revoke Invite Code Confirmation Modal */}
      <Modal isOpen={!!codeToRevoke} onClose={() => setCodeToRevoke(null)} title="Confirm Revocation">
        {codeToRevoke && (
          <div className="space-y-4">
            <p className="text-slate-600">Are you sure you want to revoke the invite code <strong className="font-semibold text-slate-800">{codeToRevoke.id}</strong>?</p>
            <p className="text-sm text-slate-500">This action cannot be undone. The code will be marked as 'Revoked' and can no longer be used for sign-ups.</p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCodeToRevoke(null)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevokeCode}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Revoking...' : 'Revoke Code'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Clear All Audit Logs Confirmation Modal */}
      <Modal isOpen={isClearLogsModalOpen} onClose={() => setIsClearLogsModalOpen(false)} title="Confirm Clear All Audit Logs">
        <div className="space-y-4">
          <p className="text-red-600 font-semibold">This action will permanently delete ALL audit logs for the current section from both Firestore and your local browser storage.</p>
          <p className="text-slate-600">Are you absolutely sure you want to proceed?</p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsClearLogsModalOpen(false)}
              disabled={isClearingDevData}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAllAuditLogs}
              disabled={isClearingDevData}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearingDevData ? 'Clearing...' : 'Clear Logs'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear All Used/Revoked Invite Codes Confirmation Modal */}
      <Modal isOpen={isClearInviteCodesModalOpen} onClose={() => setIsClearInviteCodesModalOpen(false)} title="Confirm Clear Used/Revoked Invite Codes">
        <div className="space-y-4">
          <p className="text-red-600 font-semibold">This action will permanently delete ALL used or revoked invite codes from both Firestore and your local browser storage.</p>
          <p className="text-slate-600">Are you absolutely sure you want to proceed?</p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsClearInviteCodesModalOpen(false)}
              disabled={isClearingDevData}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAllUsedRevokedInviteCodes}
              disabled={isClearingDevData}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearingDevData ? 'Clearing...' : 'Clear Codes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Clear All Local Data Confirmation Modal */}
      <Modal isOpen={isClearLocalDataModalOpen} onClose={() => setIsClearLocalDataModalOpen(false)} title="Confirm Clear All Local Data">
        <div className="space-y-4">
          <p className="text-red-600 font-semibold">This action will permanently delete ALL local data (members, audit logs, pending writes, and all invite codes) for the current section from your browser's IndexedDB.</p>
          <p className="text-slate-600">This will NOT affect data in Firestore. You will need to refresh the page after this action.</p>
          <p className="text-slate-600">Are you absolutely sure you want to proceed?</p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsClearLocalDataModalOpen(false)}
              disabled={isClearingDevData}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAllLocalData}
              disabled={isClearingDevData}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearingDevData ? 'Clearing...' : 'Clear Local Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GlobalSettingsPage;