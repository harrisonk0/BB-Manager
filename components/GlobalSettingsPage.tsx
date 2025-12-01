"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Section, ToastType, UserRole } from '../types';
import { 
  fetchAllUserRoles, 
  updateUserRole, 
  approveUser,
  denyUser,
  clearAllAuditLogs,
  clearAllLocalData,
  deleteUserRole,
  createAuditLog
} from '../services/db';
import { TrashIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import Modal from './Modal';

interface GlobalSettingsPageProps {
  activeSection: Section;
  showToast: (message: string, type?: ToastType) => void;
  userRole: UserRole | null;
  refreshData: () => void;
  currentUser: any;
}

interface UserWithEmailAndRole {
  uid: string;
  email: string;
  role: UserRole;
  sections: Section[];
}

const USER_ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  'admin': 'Administrator',
  'captain': 'Company Captain',
  'officer': 'Officer',
  'pending': 'Pending Approval'
};

const ROLE_SORT_ORDER: UserRole[] = ['admin', 'captain', 'officer', 'pending'];

const GlobalSettingsPage: React.FC<GlobalSettingsPageProps> = ({ activeSection, showToast, userRole, refreshData, currentUser }) => {
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithEmailAndRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Pending Request States
  const [pendingUsers, setPendingUsers] = useState<UserWithEmailAndRole[]>([]);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDenyModalOpen, setIsDenyModalOpen] = useState(false);
  const [userToActOn, setUserToActOn] = useState<UserWithEmailAndRole | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('officer');
  const [approveSections, setApproveSections] = useState<Section[]>([]);

  // Role Management States
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithEmailAndRole | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole | ''>('');
  const [selectedNewSections, setSelectedNewSections] = useState<Section[]>([]);
  const [roleEditError, setRoleEditError] = useState<string | null>(null);

  // Dev Control States
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [isClearLocalDataModalOpen, setIsClearLocalDataModalOpen] = useState(false);
  const [isClearingDevData, setIsClearingDevData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithEmailAndRole | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const canManageUserRoles = userRole && ['admin', 'captain'].includes(userRole);
  const isAdmin = userRole === 'admin';
  const currentAuthUserUid = currentUser?.id;

  const isRoleHigherOrEqual = (role1: UserRole, role2: UserRole): boolean => {
    const index1 = ROLE_SORT_ORDER.indexOf(role1);
    const index2 = ROLE_SORT_ORDER.indexOf(role2);
    return index1 <= index2;
  };
  
  const getAssignableRoles = useCallback((currentRole: UserRole | null): UserRole[] => {
    if (currentRole === 'admin') {
      return ['admin', 'captain', 'officer'];
    }
    if (currentRole === 'captain') {
      return ['captain', 'officer'];
    }
    return [];
  }, []);

  const loadUsersWithRoles = useCallback(async () => {
    if (!canManageUserRoles) {
      setUsersWithRoles([]);
      setPendingUsers([]);
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
      setUsersWithRoles(fetchedUsers.filter(u => u.role !== 'pending'));
      setPendingUsers(fetchedUsers.filter(u => u.role === 'pending'));
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

  // --- Approval Handlers ---
  const handleOpenApprove = (user: UserWithEmailAndRole) => {
      setUserToActOn(user);
      const assignableRoles = getAssignableRoles(userRole);
      setApproveRole(assignableRoles[assignableRoles.length - 1] || 'officer');
      setApproveSections([]);
      setIsApproveModalOpen(true);
  };

  const handleOpenDeny = (user: UserWithEmailAndRole) => {
      setUserToActOn(user);
      setIsDenyModalOpen(true);
  };

  const confirmApprove = async () => {
      if (!userToActOn) return;
      setIsSaving(true);
      const sectionsToSave = approveRole === 'officer' ? approveSections : [];
      try {
          await approveUser(userToActOn.uid, userToActOn.email, approveRole, sectionsToSave, userRole);
          showToast(`User ${userToActOn.email} approved.`, 'success');
          loadUsersWithRoles();
          setIsApproveModalOpen(false);
      } catch (err: any) {
          showToast(`Failed to approve user: ${err.message}`, 'error');
      } finally {
          setIsSaving(false);
          setUserToActOn(null);
      }
  };

  const confirmDeny = async () => {
      if (!userToActOn) return;
      setIsSaving(true);
      try {
          await denyUser(userToActOn.uid, userToActOn.email, userRole);
          showToast(`User ${userToActOn.email} denied.`, 'success');
          loadUsersWithRoles();
          setIsDenyModalOpen(false);
      } catch (err: any) {
          showToast(`Failed to deny user: ${err.message}`, 'error');
      } finally {
          setIsSaving(false);
          setUserToActOn(null);
      }
  };

  // --- Role Management Handlers ---
  const handleEditUserClick = (user: UserWithEmailAndRole) => {
    setUserToEdit(user);
    setSelectedNewRole(user.role);
    setSelectedNewSections(user.sections || []);
    setRoleEditError(null);
    setIsEditUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userToEdit || !selectedNewRole) return;
    setRoleEditError(null);
    setIsSaving(true);
    const sectionsToSave = ['admin', 'captain'].includes(selectedNewRole) ? [] : selectedNewSections;
    try {
      await updateUserRole(userToEdit.uid, selectedNewRole, sectionsToSave, userRole);
      showToast(`User ${userToEdit.email} updated successfully.`, 'success');
      loadUsersWithRoles();
      setIsEditUserModalOpen(false);
    } catch (err: any) {
      setRoleEditError(err.message || "Failed to update user. Please try again.");
      showToast('Failed to update user.', 'error');
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
      await deleteUserRole(userToDelete.uid, userToDelete.email, userRole); 
      showToast(`User '${userToDelete.email}' and their account were permanently deleted.`, 'success');
      loadUsersWithRoles();
      setIsDeleteUserModalOpen(false);
    } catch (err: any) {
      showToast(`Failed to permanently delete user: ${err.message}`, 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // --- Dev Handlers ---
  const handleClearAllAuditLogs = async () => {
    setIsClearingDevData(true);
    try {
      const userEmail = currentUser?.email || 'Unknown User';
      await clearAllAuditLogs(activeSection, userEmail, userRole);
      await clearAllAuditLogs(null, userEmail, userRole);
      showToast('All audit logs cleared successfully!', 'success');
      window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section: activeSection } }));
      window.dispatchEvent(new CustomEvent('logsrefreshed', { detail: { section: null } }));
    } catch (err: any) {
      showToast(`Failed to clear audit logs: ${err.message}`, 'error');
    } finally {
      setIsClearingDevData(false);
      setIsClearLogsModalOpen(false);
    }
  };

  const handleClearAllLocalData = async () => {
    setIsClearingDevData(true);
    try {
      const userEmail = currentUser?.email || 'Unknown User';
      await createAuditLog({
        actionType: 'CLEAR_LOCAL_DATA',
        description: `Cleared all local data for ${activeSection} section.`,
        revertData: {},
        userEmail: userEmail,
      }, activeSection);
      await clearAllLocalData(activeSection);
      showToast('All local data cleared successfully! Please refresh the page.', 'success');
      window.location.reload();
    } catch (err: any) {
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
        
        {canManageUserRoles && (
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
                <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>Pending Access Requests</h2>
                <p className="text-slate-600 mb-4">Users who have signed up and are waiting for approval.</p>
                
                {loadingUsers ? (
                    <p className="text-slate-500">Loading...</p>
                ) : pendingUsers.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No pending requests.</p>
                ) : (
                    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                        {pendingUsers.map(user => (
                            <li key={user.uid} className="p-3 flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-800">{user.email}</span>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleOpenApprove(user)}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <CheckCircleIcon className="h-4 w-4 mr-1" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleOpenDeny(user)}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                        <XCircleIcon className="h-4 w-4 mr-1" /> Deny
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )}

        {canManageUserRoles && (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className={`text-xl font-semibold border-b pb-2 mb-4 ${accentText}`}>User Management</h2>
            <p className="text-slate-600 mb-4">View and manage roles and section access for approved users.</p>

            {loadingUsers ? (
              <p className="text-slate-500">Loading users...</p>
            ) : usersWithRoles.length === 0 ? (
              <p className="text-slate-500">No active users found.</p>
            ) : (
              <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                {usersWithRoles.map(user => {
                  const isCurrentUser = user.uid === currentAuthUserUid;
                  const disableManagement = isCurrentUser || 
                                            (userRole === 'captain' && isRoleHigherOrEqual(user.role, 'captain'));

                  return (
                    <li key={user.uid} className="p-3 flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <span className="font-medium text-slate-800">{user.email}</span>
                        <p className="text-xs text-slate-500 mt-1">
                            <span className="font-semibold">{USER_ROLE_DISPLAY_NAMES[user.role]}</span>
                            {user.sections && user.sections.length > 0 && (
                                <> &bull; {user.sections.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}</>
                            )}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                            onClick={() => handleEditUserClick(user)}
                            disabled={disableManagement || isSaving}
                            className={`px-3 py-1.5 text-sm font-medium text-white rounded-md shadow-sm hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${accentBg} ${accentRing} ${disableManagement || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleDeleteUserClick(user)}
                            disabled={disableManagement || isDeletingUser}
                            className={`p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-100 ${disableManagement || isDeletingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label={`Delete user ${user.email}`}
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

        {isAdmin && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 sm:p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-red-800 border-b border-red-300 pb-2 mb-4">Development Controls (Admin Only)</h2>
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => setIsClearLogsModalOpen(true)}
                  disabled={isClearingDevData}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All Audit Logs
                </button>
              </div>
              <div>
                <button
                  onClick={() => setIsClearLocalDataModalOpen(true)}
                  disabled={isClearingDevData}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All Local Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Approve Request">
          <div className="space-y-4">
              <p className="text-slate-600">Approve access for <strong className="text-slate-800">{userToActOn?.email}</strong>?</p>
              <div>
                  <label className="block text-sm font-medium text-slate-700">Assign Role</label>
                  <select value={approveRole} onChange={(e) => setApproveRole(e.target.value as UserRole)} className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}>
                      {getAssignableRoles(userRole).map(role => (
                          <option key={role} value={role}>{USER_ROLE_DISPLAY_NAMES[role]}</option>
                      ))}
                  </select>
              </div>
              {approveRole === 'officer' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700">Assign Sections</label>
                    <div className="mt-2 space-y-2">
                        {(['company', 'junior'] as Section[]).map(section => (
                            <label key={section} className="flex items-center">
                                <input type="checkbox" checked={approveSections.includes(section)} onChange={() => setApproveSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])} className={`h-4 w-4 rounded border-gray-300 ${accentText}`} />
                                <span className="ml-2 text-sm text-slate-600">{section.charAt(0).toUpperCase() + section.slice(1)} Section</span>
                            </label>
                        ))}
                    </div>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button onClick={() => setIsApproveModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-md">Cancel</button>
                  <button onClick={confirmApprove} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700">
                      {isSaving ? 'Approving...' : 'Approve'}
                  </button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isDenyModalOpen} onClose={() => setIsDenyModalOpen(false)} title="Deny Request">
          <div className="space-y-4">
              <p className="text-slate-600">Are you sure you want to deny access for <strong className="text-slate-800">{userToActOn?.email}</strong>? This will permanently delete their account.</p>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button onClick={() => setIsDenyModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-md">Cancel</button>
                  <button onClick={confirmDeny} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700">
                      {isSaving ? 'Denying...' : 'Deny & Delete'}
                  </button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title="Edit User">
        {userToEdit && userRole && (
          <div className="space-y-6">
            <p className="text-slate-600">Editing user: <strong className="font-semibold text-slate-800">{userToEdit.email}</strong></p>
            {roleEditError && <p className="text-red-500 text-sm">{roleEditError}</p>}
            <div>
              <label htmlFor="new-role" className="block text-sm font-medium text-slate-700">Role</label>
              <select id="new-role" value={selectedNewRole} onChange={(e) => setSelectedNewRole(e.target.value as UserRole)} className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRing}`}>
                {getAssignableRoles(userRole).map(roleValue => (
                    <option key={roleValue} value={roleValue}>{USER_ROLE_DISPLAY_NAMES[roleValue]}</option>
                ))}
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Accessible Sections</label>
                <div className="mt-2 space-y-2">
                    {(['company', 'junior'] as Section[]).map(section => {
                        const isPrivilegedRole = ['admin', 'captain'].includes(selectedNewRole || '');
                        return (
                            <label key={section} className={`flex items-center ${isPrivilegedRole ? 'cursor-not-allowed' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedNewSections.includes(section) || isPrivilegedRole}
                                    disabled={isPrivilegedRole}
                                    onChange={() => {
                                        if (!isPrivilegedRole) {
                                            setSelectedNewSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])
                                        }
                                    }} 
                                    className={`h-4 w-4 rounded border-gray-300 ${accentText} ${isPrivilegedRole ? 'opacity-50' : ''}`} 
                                />
                                <span className={`ml-2 text-sm ${isPrivilegedRole ? 'text-slate-400' : 'text-slate-600'}`}>{section.charAt(0).toUpperCase() + section.slice(1)} Section</span>
                            </label>
                        );
                    })}
                </div>
                {['admin', 'captain'].includes(selectedNewRole || '') && (
                    <p className="text-xs text-slate-500 mt-2">Administrators and Captains automatically have access to all sections.</p>
                )}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button type="button" onClick={() => setIsEditUserModalOpen(false)} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md">Cancel</button>
              <button onClick={handleSaveUser} disabled={isSaving} className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm ${accentBg} disabled:opacity-50`}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDeleteUserModalOpen} onClose={() => setIsDeleteUserModalOpen(false)} title="Confirm Permanent User Deletion">
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-red-600 font-semibold"><span className="font-bold">SECURITY WARNING:</span> Are you sure you want to permanently delete the user account for <strong className="text-slate-800">{userToDelete.email}</strong>?</p>
            <p className="text-slate-600">This action will remove the user from Supabase Authentication and delete their role record. This cannot be undone.</p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
              <button onClick={() => setIsDeleteUserModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-md">Cancel</button>
              <button onClick={confirmDeleteUser} disabled={isDeletingUser} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700">
                {isDeletingUser ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isClearLogsModalOpen} onClose={() => setIsClearLogsModalOpen(false)} title="Confirm Clear Logs">
        <div className="space-y-4">
          <p className="text-slate-600">Are you sure you want to clear all audit logs?</p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button onClick={() => setIsClearLogsModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-md">Cancel</button>
            <button onClick={handleClearAllAuditLogs} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md">Clear</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isClearLocalDataModalOpen} onClose={() => setIsClearLocalDataModalOpen(false)} title="Confirm Clear Local Data">
        <div className="space-y-4">
          <p className="text-slate-600">Are you sure you want to clear all local data? This may help fix sync issues.</p>
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button onClick={() => setIsClearLocalDataModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-md">Cancel</button>
            <button onClick={handleClearAllLocalData} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md">Clear</button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default GlobalSettingsPage;