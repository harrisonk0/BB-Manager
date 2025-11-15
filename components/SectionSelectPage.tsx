/**
 * @file SectionSelectPage.tsx
 * @description This page is shown to the user after they log in for the first time
 * or after they explicitly choose to "Switch Section". It allows them to select
 * which section (Company or Junior) they want to manage.
 */

import React from 'react';
import { Section, Page } from '../types';
import { QuestionMarkCircleIcon, CogIcon, LogOutIcon } from './Icons'; // Import LogOutIcon

interface SectionSelectPageProps {
  /** Callback function to inform the parent App component of the user's selection. */
  onSelectSection: (section: Section) => void;
  /** Callback to navigate to the help page. */
  onNavigateToHelp: () => void;
  /** Callback to navigate to the global settings page. */
  onNavigateToGlobalSettings: () => void;
  /** The role of the currently logged-in user. */
  userRole: string | null;
  /** Callback to handle user sign out. */
  onSignOut: () => void; // New prop for sign out
}

const SectionSelectPage: React.FC<SectionSelectPageProps> = ({ onSelectSection, onNavigateToHelp, onNavigateToGlobalSettings, userRole, onSignOut }) => {
  const canAccessGlobalSettings = userRole && ['admin', 'captain'].includes(userRole);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-200 p-4">
       <button 
        onClick={onNavigateToHelp} 
        className={`absolute bottom-6 ${canAccessGlobalSettings ? 'right-20' : 'right-6'} text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 rounded-full`}
        aria-label="Help"
      >
        <QuestionMarkCircleIcon className="h-8 w-8" />
      </button>

      {canAccessGlobalSettings && (
        <button 
          onClick={onNavigateToGlobalSettings} 
          className="absolute bottom-6 right-6 text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 rounded-full"
          aria-label="Global Settings"
        >
          <CogIcon className="h-8 w-8" />
        </button>
      )}

      {/* New Log Out button */}
      <button 
        onClick={onSignOut} 
        className={`absolute bottom-6 ${canAccessGlobalSettings ? 'right-36' : 'right-6'} text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 rounded-full`}
        aria-label="Log Out"
      >
        <LogOutIcon className="h-8 w-8" />
      </button>

      <div className="w-full max-w-lg text-center">
        <img 
          src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" 
          alt="The Boys' Brigade Logo" 
          className="h-20 mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Select a Section</h1>
        <p className="text-slate-600 mb-8">Choose which section you want to manage.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Section Button */}
          <button
            onClick={() => onSelectSection('company')}
            className="p-8 bg-company-blue text-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 focus:ring-white"
            aria-label="Manage Company Section"
          >
            <img src="https://i.postimg.cc/0j44DjdY/company-boxed-colour.png" alt="Company Section Logo" className="w-56 mx-auto" />
            <p className="mt-4 text-slate-200">Manage boys in school years 8-14.</p>
          </button>

          {/* Junior Section Button */}
          <button
            onClick={() => onSelectSection('junior')}
            className="p-8 bg-junior-blue text-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 focus:ring-white"
            aria-label="Manage Junior Section"
          >
            <img src="https://i.postimg.cc/W1qvWLdp/juniors-boxed-colour.png" alt="Junior Section Logo" className="w-56 mx-auto" />
            <p className="mt-4 text-slate-200">Manage boys in school years P4-P7.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionSelectPage;