/**
 * @file Toast.tsx
 * @description A component to display a single toast notification.
 * It includes an icon, a message, and automatically dismisses itself.
 */

import React, { useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircleIcon, XCircleIcon, InfoCircleIcon, XIcon } from './Icons';

interface ToastProps {
  toast: ToastMessage;
  removeToast: (id: string) => void;
}

const ICONS = {
  success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
  error: <XCircleIcon className="h-6 w-6 text-red-500" />,
  info: <InfoCircleIcon className="h-6 w-6 text-blue-500" />,
};

const Toast: React.FC<ToastProps> = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, removeToast]);

  // Determine progress bar color based on toast type
  const progressBarColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[toast.type];

  return (
    <div
      className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden relative"
      role="alert"
      aria-live="assertive"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {ICONS[toast.type]}
          </div>
          <div className="ml-3 flex-1 pt-0.5"> {/* Removed w-0 */}
            <p className="text-sm font-medium text-slate-900">{toast.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => removeToast(toast.id)}
              className="bg-white rounded-md inline-flex text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
              aria-label="Close notification"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Progress Bar */}
      <div className={`absolute bottom-0 left-0 h-1 ${progressBarColor}`} style={{ animation: 'progressBar 5s linear forwards' }}></div>
      <style jsx>{`
        @keyframes progressBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default Toast;