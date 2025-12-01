import React from 'react';
import { StarIcon, SearchIcon, FilterIcon, PlusIcon } from '../Icons';

export const LoginPreview: React.FC = () => (
    <div className="w-full max-w-sm mx-auto p-6 bg-white rounded-lg shadow-md border border-slate-200">
        <div className="text-center">
            <h2 className="text-lg text-slate-600">Sign in to your account</h2>
        </div>
        <div className="mt-4 space-y-3">
            <input type="email" placeholder="Email" disabled className="block w-full px-3 py-2 border rounded-md bg-slate-100" />
            <button disabled className="w-full py-2 px-4 rounded-md text-white bg-blue-800/80">Sign In</button>
        </div>
    </div>
);

export const DashboardPreview: React.FC = () => (
    <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold flex items-center"><StarIcon className="h-5 w-5 mr-2 text-yellow-500" /> Top 5 Members</h3>
            <ol className="space-y-2 text-sm">
                <li className="flex justify-between"><span>1. John Smith</span><strong>85</strong></li>
            </ol>
        </div>
    </div>
);

// ... export others similarly (HomePageControlsPreview, etc.)