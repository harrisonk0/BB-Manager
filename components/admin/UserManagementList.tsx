import React from 'react';
import { UserRole, Section } from '../../types';
import { TrashIcon } from '../Icons';

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

interface UserManagementListProps {
  users: UserWithEmailAndRole[];
  currentUserUid: string | undefined;
  currentUserRole: UserRole | null;
  loading: boolean;
  onEdit: (user: UserWithEmailAndRole) => void;
  onDelete: (user: UserWithEmailAndRole) => void;
  isActionInProgress: boolean;
}

const UserManagementList: React.FC<UserManagementListProps> = ({ users, currentUserUid, currentUserRole, loading, onEdit, onDelete, isActionInProgress }) => {
  const isRoleHigherOrEqual = (role1: UserRole, role2: UserRole): boolean => {
    return ROLE_SORT_ORDER.indexOf(role1) <= ROLE_SORT_ORDER.indexOf(role2);
  };

  if (loading) return <p className="text-slate-500">Loading users...</p>;
  if (users.length === 0) return <p className="text-slate-500">No active users found.</p>;

  return (
    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
      {users.map(user => {
        const isCurrentUser = user.uid === currentUserUid;
        const disableManagement = isCurrentUser || (currentUserRole === 'captain' && isRoleHigherOrEqual(user.role, 'captain'));

        return (
          <li key={user.uid} className="p-3 flex items-center justify-between text-sm">
            <div className="flex-1">
              <span className="font-medium text-slate-800">{user.email}</span>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold">{USER_ROLE_DISPLAY_NAMES[user.role]}</span>
                {user.sections && user.sections.length > 0 && <> &bull; {user.sections.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}</>}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(user)}
                disabled={disableManagement || isActionInProgress}
                className={`px-3 py-1.5 text-sm font-medium text-white rounded-md shadow-sm bg-company-blue hover:brightness-90 ${disableManagement || isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(user)}
                disabled={disableManagement || isActionInProgress}
                className={`p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-100 ${disableManagement || isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <TrashIcon className="h-5 w-5"/>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default UserManagementList;