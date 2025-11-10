/**
 * @file Modal.tsx
 * @description A generic, reusable modal component for displaying content in a dialog overlay.
 * It handles the open/close state and provides a consistent structure for titles and content.
 */

import React from 'react';

interface ModalProps {
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Callback function to be called when the modal should be closed (e.g., by clicking the 'x' button). */
  onClose: () => void;
  /** The title to be displayed at the top of the modal. */
  title: string;
  /** The content to be rendered inside the modal body. */
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // If the modal is not open, render nothing.
  if (!isOpen) return null;

  return (
    // The overlay covers the entire screen.
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      {/* The main modal container. */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl font-light" aria-label="Close modal">&times;</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
