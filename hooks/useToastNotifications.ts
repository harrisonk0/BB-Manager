"use client";

import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../types';

/**
 * Custom hook for managing toast notifications.
 * Provides state for toasts and functions to show and remove them.
 */
export const useToastNotifications = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
};