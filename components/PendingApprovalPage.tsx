/**
 * @file PendingApprovalPage.tsx
 * @description Displayed to users who have signed up but have not yet been approved by an administrator.
 */

import React from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { ClockIcon, LogOutIcon } from './Icons';

const PendingApprovalPage: React.FC = () => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-slate-200 p-4 bg-cover bg-center"
      style={{ backgroundImage: 'url(https://i.postimg.cc/MKD36t18/mixed-activities.jpg)' }}
    >
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        <div className="flex justify-center mb-4">
            <div className="p-4 bg-yellow-100 rounded-full">
                <ClockIcon className="h-12 w-12 text-yellow-600" />
            </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Registration Pending</h1>
        <p className="text-slate-600">
          Your account has been created successfully and is currently awaiting approval.
        </p>
        <p className="text-slate-500 text-sm">
          Please contact your Company Captain or an Administrator to have your account activated.
        </p>
        
        <div className="pt-4 border-t border-slate-100">
            <button
                onClick={handleSignOut}
                className="inline-flex items-center text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
                <LogOutIcon className="h-5 w-5 mr-2" />
                Sign Out
            </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;