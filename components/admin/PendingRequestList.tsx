import React from 'react';
import { UserRole, Section } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../Icons';

interface UserWithEmailAndRole {
  uid: string;
  email: string;
  role: UserRole;
  sections: Section[];
}

interface PendingRequestListProps {
  pendingUsers: UserWithEmailAndRole[];
  onApprove: (user: UserWithEmailAndRole) => void;
  onDeny: (user: UserWithEmailAndRole) => void;
}

const PendingRequestList: React.FC<PendingRequestListProps> = ({ pendingUsers, onApprove, onDeny }) => {
  if (pendingUsers.length === 0) {
    return <p className="text-slate-500 text-sm italic">No pending requests.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-md">
      {pendingUsers.map(user => (
        <li key={user.uid} className="p-3 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">{user.email}</span>
          <div className="flex space-x-2">
            <button onClick={() => onApprove(user)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700">
              <CheckCircleIcon className="h-4 w-4 mr-1" /> Approve
            </button>
            <button onClick={() => onDeny(user)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700">
              <XCircleIcon className="h-4 w-4 mr-1" /> Deny
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default PendingRequestList;