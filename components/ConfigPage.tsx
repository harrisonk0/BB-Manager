import React, { useState } from 'react';
import { FirebaseConfig } from '../services/firebase';

interface ConfigPageProps {
  onConfigSaved: () => void;
  initialError?: string | null;
}

const CONFIG_KEYS: (keyof FirebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const ConfigPage: React.FC<ConfigPageProps> = ({ onConfigSaved, initialError }) => {
  const [config, setConfig] = useState<Partial<FirebaseConfig>>({});
  const [error, setError] = useState<string | null>(initialError || null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const missingKeys = CONFIG_KEYS.filter(key => !config[key]);
    if (missingKeys.length > 0) {
      setError(`Please fill in all fields. Missing: ${missingKeys.join(', ')}`);
      return;
    }

    localStorage.setItem('firebaseConfig', JSON.stringify(config));
    onConfigSaved();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-lg p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">Firebase Setup</h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your Firebase project configuration to connect to your cloud database.
          </p>
        </div>

        {error && (
            <div className="p-4 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-md">
                <strong>Error:</strong> {error}
            </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {CONFIG_KEYS.map((key, index) => (
              <div key={key}>
                <label htmlFor={key} className="sr-only">{key}</label>
                <input
                  id={key}
                  name={key}
                  type="text"
                  required
                  className={`relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm 
                    ${index === 0 ? 'rounded-t-md' : ''} 
                    ${index === CONFIG_KEYS.length - 1 ? 'rounded-b-md' : ''}`}
                  placeholder={key}
                  onChange={handleChange}
                  value={config[key] || ''}
                />
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Save and Connect
            </button>
          </div>
        </form>
         <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            You can find these values in your Firebase project settings under "General".
        </p>
      </div>
    </div>
  );
};

export default ConfigPage;
