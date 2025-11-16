/**
 * @file Modal.tsx
 * @description A generic, reusable modal component for displaying content in a dialog overlay.
 * It handles the open/close state and provides a consistent structure for titles and content.
 * Includes accessibility improvements like focus trapping and Escape key dismissal.
 */

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  /** Whether the modal is currently visible. */
  isOpen: boolean;
  /** Callback function to be called when the modal should be closed (e.g., by clicking the 'x' button or Escape key). */
  onClose: () => void;
  /** The title to be displayed at the top of the modal. */
  title: string;
  /** The content to be rendered inside the modal body. */
  children: React.ReactNode;
  /** The size of the modal. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save the currently focused element to restore focus later
      previouslyFocusedElement.current = document.activeElement as HTMLElement;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusableElement = focusableElements?.[0] as HTMLElement;
      const lastFocusableElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

      // Focus the first focusable element when the modal opens
      firstFocusableElement?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        // Close modal on Escape key
        if (event.key === 'Escape') {
          onClose();
        }

        // Trap focus within the modal
        if (event.key === 'Tab' && focusableElements && focusableElements.length > 0) {
          if (event.shiftKey) {
            // If Shift + Tab and focus is on the first element, move to the last
            if (document.activeElement === firstFocusableElement) {
              lastFocusableElement?.focus();
              event.preventDefault();
            }
          } else {
            // If Tab and focus is on the last element, move to the first
            if (document.activeElement === lastFocusableElement) {
              firstFocusableElement?.focus();
              event.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore focus to the element that was focused before the modal opened
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  // If the modal is not open, render nothing.
  if (!isOpen) return null;

  // Determine modal width and height classes based on the 'size' prop
  let maxWidthClass = 'max-w-md';
  let maxHeightClass = 'max-h-[90vh]'; // Default max height for all sizes
  let paddingClass = 'p-4'; // Default padding for the overlay

  switch (size) {
    case 'sm':
      maxWidthClass = 'max-w-sm';
      break;
    case 'md':
      maxWidthClass = 'max-w-md';
      break;
    case 'lg':
      maxWidthClass = 'max-w-2xl';
      break;
    case 'full':
      maxWidthClass = 'max-w-full w-11/12'; // Take up most of the width
      maxHeightClass = 'max-h-full h-11/12'; // Take up most of the height
      paddingClass = 'p-2'; // Less padding for full-screen effect
      break;
  }

  return (
    // The overlay covers the entire screen.
    <div 
      className={`fixed inset-0 bg-slate-900 bg-opacity-60 z-50 flex justify-center items-center ${paddingClass}`} 
      aria-modal="true" 
      role="dialog"
      tabIndex={-1} // Ensure the modal itself can receive focus initially
    >
      {/* The main modal container. */}
      <div ref={modalRef} className={`bg-white rounded-lg shadow-xl w-full ${maxWidthClass} ${maxHeightClass} flex flex-col`}>
        <div className="p-5 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-3xl font-light" 
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow"> {/* Added overflow-y-auto and flex-grow here */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;