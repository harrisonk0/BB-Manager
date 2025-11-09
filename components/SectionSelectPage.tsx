import React from 'react';
import { Section } from '../types';

interface SectionSelectPageProps {
  onSelectSection: (section: Section) => void;
}

const SectionSelectPage: React.FC<SectionSelectPageProps> = ({ onSelectSection }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-lg text-center">
        <img 
          src="https://i.postimg.cc/76v1rXkf/temp-Image8-Qmy6-T.avif" 
          alt="BBNI The Northern Ireland Boys' Brigade Logo" 
          className="h-24 mx-auto mb-6"
        />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Select a Section</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Choose which section you want to manage.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelectSection('company')}
            className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bb-blue"
            aria-label="Manage Company Section"
          >
            <h2 className="text-2xl font-semibold text-bb-blue">Company Section</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Manage boys in school years 8-14.</p>
          </button>

          <button
            onClick={() => onSelectSection('junior')}
            className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            aria-label="Manage Junior Section"
          >
            <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400">Junior Section</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Manage boys in school years P4-P7.</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SectionSelectPage;
