import React from 'react';
import { Section } from '../types';
import { LogOutIcon } from './Icons';
import { branding } from './branding';

interface SectionSelectPageProps {
  onSelectSection: (section: Section) => void;
  onSignOut: () => void;
}

const SectionSelectPage: React.FC<SectionSelectPageProps> = ({ onSelectSection, onSignOut }) => {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-slate-200 p-4 bg-cover bg-center"
      style={{ backgroundImage: `url(${branding.bbBackground})` }}
    >
      <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-lg shadow-md text-center">
        <img
          src={branding.bbLogo}
          alt="The Boys' Brigade Logo"
          className="h-20 mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Select a Section</h1>
        <p className="text-slate-600 mb-8">Choose which section you want to manage.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelectSection('company')}
            className="p-8 bg-company-blue text-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 focus:ring-white"
            aria-label="Manage Company Section"
          >
            <img src={branding.companyLogo} alt="Company Section Logo" className="w-56 mx-auto" />
            <p className="mt-4 text-slate-200">Manage boys in school years 8-14.</p>
          </button>

          <button
            onClick={() => onSelectSection('junior')}
            className="p-8 bg-junior-blue text-white rounded-lg shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 focus:ring-white"
            aria-label="Manage Junior Section"
          >
            <img src={branding.juniorLogo} alt="Junior Section Logo" className="w-56 mx-auto" />
            <p className="mt-4 text-slate-200">Manage boys in school years P4-P7.</p>
          </button>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center justify-center mt-4 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          <LogOutIcon className="h-5 w-5 mr-2" />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default SectionSelectPage;
