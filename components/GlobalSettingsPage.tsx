"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Section, ToastType, InviteCode, UserRole } from '../types';
import {
  createAuditLog,
  createInviteCode,
  fetchAllInviteCodes,
  fetchAllUserRoles,
  updateUserRole,
  revokeInviteCode,
  clearAllAuditLogs,
  clearAllUsedRevokedInviteCodes,
  updateInviteCode,
  deleteUserRole
} from '../services/db';
import { ClipboardIcon, TrashIcon } from './Icons'; // Import TrashIcon
import Modal from './Modal';
import { useAuthAndRole } from '../hooks/useAuthAndRole';

interface GlobalSettingsPageProps {
  activeSection: Section;
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
  const [codeToEdit, setCodeToEdit] = useState<InviteCode | null>(null);
  const [isEditInviteCodeModalOpen, setIsEditInviteCodeModalOpen] = useState(false);
  const [editedDefaultUserRole, setEditedDefaultUserRole] = useState<UserRole>('officer');
  const [editedExpiresAt, setEditedExpiresAt] = useState<string>('');
  const [inviteCodeEditError, setInviteCodeEditError] = useState<string | null>(null);

  const [usersWithRoles, setUsersWithRoles] = useState<UserWithEmailAndRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [userToEditRole, setUserToEditRole] = useState<UserWithEmailAndRole | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole | ''>('');
  const [roleEditError, setRoleEditError] = useState<string | null>(null);

  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [isClearInviteCodesModalOpen, setIsClearInviteCodesModalOpen] = useState(false);
  const [isClearingDevData, setIsClearingDevData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithEmailAndRole | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);


  const canManageInviteCodes = userRole && ['admin', 'captain'].includes(userRole);
  const canManageUserRoles = userRole && ['admin', 'captain'].includes(userRole);
  const isAdmin = userRole === 'admin';
  const { user } = useAuthAndRole();
  const currentAuthUserUid = user?.id;

  // Helper to compare roles: returns true if role1 has higher or equal privilege than role2
  const isRoleHigherOrEqual = (role1: UserRole, role2: UserRole): boolean => {
    const index1 = ROLE_SORT_ORDER.indexOf(role1);
    const index2 = ROLE_SORT_ORDER.indexOf(role2);
    return index1 <= index2; // Lower index means higher privilege
  };

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
      const userEmail = user?.email || 'Unknown User';

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
      showToast(`Failed to generate invite code: ${err.message}`, 'error');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      showToast('Invite code copied to clipboard!', 'info');
    }).catch(err => {
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
      showToast(`Failed to revoke invite code: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditInviteCodeClick = (code: InviteCode) => {
    setCodeToEdit(code);
    setEditedDefaultUserRole(code.defaultUserRole);
    // Format expiresAt to YYYY-MM-DDTHH:mm for datetime-local input
    const expiryDate = new Date(code.expiresAt);
    setEditedExpiresAt(expiryDate.toISOString().slice(0, 16)); // "YYYY-MM-DDTHH:mm"
    setInviteCodeEditError(null);
    setIsEditInviteCodeModalOpen(true);
  };

  const handleSaveInviteCode = async () => {
    if (!codeToEdit) return;

    setInviteCodeEditError(null);
    setIsSaving(true);

    try {
      const newExpiresAt = new Date(editedExpiresAt).getTime();
      if (isNaN(newExpiresAt)) {
        throw new Error("Invalid expiry date/time.");
      }
      if (newExpiresAt < Date.now()) {
        throw new Error("Expiry date/time cannot be in the past.");
      }

      const updates: Partial<InviteCode> = {
        defaultUserRole: editedDefaultUserRole,
        expiresAt: newExpiresAt,
      };

      const changes: string[] = [];
      if (codeToEdit.defaultUserRole !== editedDefaultUserRole) {
        changes.push(`default role from ${codeToEdit.defaultUserRole} to ${editedDefaultUserRole}`);
      }
      if (codeToEdit.expiresAt !== newExpiresAt) {
        changes.push(`expiry date from ${new Date(codeToEdit.expiresAt).toLocaleString()} to ${new Date(newExpiresAt).toLocaleString()}`);
      }

      if (changes.length > 0) {
        const userEmail = user?.email || 'Unknown User';
        await createAuditLog({
          userEmail,
          actionType: 'UPDATE_INVITE_CODE',
          description: `Updated invite code ${codeToEdit.id}: changed ${changes.join(', ')}.`,
          revertData: { inviteCodeId: codeToEdit.id, oldDefaultUserRole: codeToEdit.defaultUserRole, oldExpiresAt: codeToEdit.expiresAt },
        }, activeSection);
      }

      await updateInviteCode(codeToEdit.id, updates, userRole);
      showToast(`Invite code '${codeToEdit.id}' updated successfully.`, 'success');
      loadInviteCodes();
      setIsEditInviteCodeModalOpen(false);
    } catch (err: any) {
      setInviteCodeEditError(err.message || "Failed to update invite code. Please try again.");
      showToast('Failed to update invite code.', 'error');
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
      setRoleEditError(err.message || "Failed to update role. Please try again.");
      showToast('Failed to update user role.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUserClick = (user: UserWithEmailAndRole) => {
    setUserToDelete(user);
    setIsDeleteUserModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      const userEmail = user?.email || 'Unknown User';

      await deleteUserRole(userToDelete.uid, userRole);

      await createAuditLog({
        userEmail,
        actionType: 'DELETE_USER_ROLE',
        description: `Deleted user role for: ${userToDelete.email}`,
        revertData: { uid: userToDelete.uid, email: userToDelete.email, role: userToDelete.role },
      }, null); // Global log

      showToast(`User '${userToDelete.email}' role deleted successfully.`, 'success');
      loadUsersWithRoles();
      setIsDeleteUserModalOpen(false);
    } catch (err: any) {
      showToast(`Failed to delete user role: ${err.message}`, 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleClearAllAuditLogs = async () => {
    setIsClearingDevData(true);
    try {
      const userEmail = user?.email || 'Unknown User';
      // Pass null for section to clear global logs as well
      await clearAllAuditLogs(activeSection, userEmail, userRole); // This will clear section-specific logs
      await clearAllAuditLogs(null, userEmail, userRole); // Clear global logs
      showToast('All audit logs cleared successfully!', 'success');
    } catch (err: any) {
      showToast(`Failed to clear audit logs: ${err.message}`, 'error');
    } finally {
      setIsClearingDevData(false);
      setIsClearLogsModalOpen(false);
    }
  };

  const handleClearAllUsedRevokedInviteCodes = async () => {
    setIsClearingDevData(true);
    try {
      const userEmail = user?.email || 'Unknown User';
      await clearAllUsedRevokedInviteCodes(userEmail, userRole);
      showToast('All used/revoked invite codes cleared successfully!', 'success');
      loadInviteCodes();
    } catch (err: any) {
      showToast(`Failed to clear invite codes: ${err.message}`, 'error');
    } finally {
      setIsClearingDevData(false);
      setIsClearInviteCodesModalOpen(false);
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
            <p className="text-slate-600 mb-4">Generate a one-time-use code to invite new users to the app. Share this code with them so they can sign up. Codes expire after 3 days.</p>
            
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
                    // Prioritize 'Revoked' over 'Used'
                    const statusText = code.revoked ? 'Revoked' : (code.isUsed ? 'Used' : (isExpired ? 'Expired' : 'Active'));
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
                            <>
                                <button
                                    onClick={() => handleEditInviteCodeClick(code)}
                                    className={`px-3 py-1.5 text-xs font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentBg} ${accentRing}`}
                                    disabled={isSaving}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleRevokeClick(code)}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    disabled={isSaving}
                                >
                                    Revoke
                                </button>
                            </>
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
                {usersWithRoles.map(user => {
                  const isCurrentUser = user.uid === currentAuthUserUid;
                  // Disable if:
                  // 1. It's the current user (cannot edit self)
                  // 2. The acting user is an 'officer' (cannot manage any roles)
                  // 3. The acting user is a 'captain' AND the target user's role is 'admin' or 'captain'
                  const disableManagement = isCurrentUser || 
                                            (userRole === 'officer') || 
                                            (userRole === 'captain' && isRoleHigherOrEqual(user.role, 'captain'));

                  return (
                    <li key={user.uid} className="p-3 flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium text-slate-800">{user.email}</span>
                        <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">{USER_ROLE_DISPLAY_NAMES[user.role]}</span></p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                            onClick={() => handleEditRoleClick(user)}
                            disabled={disableManagement || isSaving}
                            className={`px-3 py-1.5 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentBg} ${accentRing} ${disableManagement || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Edit Role
                        </button>
                        <button
                            onClick={() => handleDeleteUserClick(user)}
                            disabled={disableManagement || isDeletingUser}
                            className={`p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-100 ${disableManagement || isDeletingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label={`Delete role for ${user.email}`}
                        >
                            <TrashIcon className="h-5 w-5"/>
                        </button>
                      </div>
                    </li>
                  );
                })}
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
                  Clear All Audit Logs (Current Section & Global)
                </button>
                <p className="mt-1 text-xs text-red-700">Deletes all audit logs for the current section AND global audit logs from Firestore and local storage.</p>
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
            </div>
          </div>
        )}
      </div>

      {/* Role Edit Modal */}
      <Modal isOpen={!!isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Edit User Role">
        {userToEditRole && userRole && (
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
                {ROLE_SORT_ORDER.filter(roleOption => 
                    // Allow selecting roles strictly lower than the acting user's role
                    // And if the target user is the current user, only allow changing to the same role (effectively disabling change)
                    // Or if the acting user is admin, allow changing to any role except self-demotion
                    (userRole === 'admin' && userToEditRole.uid !== currentAuthUserUid) || // Admin can change any role except their own
                    (userRole === 'captain' && ROLE_SORT_ORDER.indexOf(roleOption) > ROLE_SORT_ORDER.indexOf('captain')) || // Captain can only promote to officer
                    (userToEditRole.uid === currentAuthUserUid && roleOption === userToEditRole.role) // Current user can't change their own role
                ).map(roleValue => (
                  <option key={roleValue} value={roleValue}>{USER_ROLE_DISPLAY_NAMES[roleValue]}</option>
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

      {/* Edit Invite Code Modal */}
      <Modal isOpen={isEditInviteCodeModalOpen} onClose={() => setIsEditInviteCodeModalOpen(false)} title="Edit Invite Code">
        {codeToEdit && userRole && (
          <div className="space-y-4">
            <p className="text-slate-600">Editing invite code: <strong className="font-semibold text-slate-800">{codeToEdit.id}</strong></p>
            {inviteCodeEditError && <p className="text-red-500 text-sm">{inviteCodeEditError}</p>}
            <div>
              <label htmlFor="edit-default-role" className="block text-sm font-medium text-slate-700">Default User Role</label>
              <select
                id="edit-default-role"
                value={editedDefaultUserRole}
                onChange={(e) => setEditedDefaultUserRole(e.target.value as UserRole)}
                className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
              >
                {ROLE_SORT_ORDER.filter(roleOption => 
                    // Only allow selecting roles strictly lower than the acting user's role
                    ROLE_SORT_ORDER.indexOf(roleOption) > ROLE_SORT_ORDER.indexOf(userRole)
                ).map(roleValue => (
                  <option key={roleValue} value={roleValue}>{USER_ROLE_DISPLAY_NAMES[roleValue]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-expires-at" className="block text-sm font-medium text-slate-700">Expires At</label>
              <input
                id="edit-expires-at"
                type="datetime-local" // Changed to datetime-local
                value={editedExpiresAt}
                onChange={(e) => setEditedExpiresAt(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditInviteCodeModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInviteCode}
                disabled={isSaving}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${accentBg} ${accentRing}`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
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
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Revoking...' : 'Revoke Code'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal isOpen={isDeleteUserModalOpen} onClose={() => setIsDeleteUserModalOpen(false)} title="Confirm User Deletion">
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-red-600 font-semibold">Are you sure you want to delete the role for user <strong className="text-slate-800">{userToDelete.email}</strong>?</p>
            <p className="text-slate-600">This will remove their assigned role from the application. They will no longer be able to log in unless a new role is assigned. This action can be reverted from the audit log.</p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsDeleteUserModalOpen(false)}
                disabled={isDeletingUser}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete User Role'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Clear All Audit Logs Confirmation Modal */}
      <Modal isOpen={isClearLogsModalOpen} onClose={() => setIsClearLogsModalOpen(false)} title="Confirm Clear All Audit Logs">
        <div className="space-y-4">
          <p className="text-red-600 font-semibold">This action will permanently delete ALL audit logs for the current section AND global audit logs from both Firestore and your local browser storage.</p>
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearingDevData ? 'Clearing...' : 'Clear Codes'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default GlobalSettingsPage;