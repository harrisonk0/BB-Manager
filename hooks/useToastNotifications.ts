import { useState, useCallback, useEffect, useRef } from "react";
import { ToastMessage, ToastType } from "../types";

/** Transient feedback is scoped too: stale mutation callbacks cannot expose names after logout. */
export const useToastNotifications = (scope = "public") => {
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [stored, setStored] = useState<(ToastMessage & { scope: string })[]>(
    [],
  );
  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      if (currentScope.current !== scope) return;
      const id = crypto.randomUUID();
      setStored((previous) => [
        ...previous.filter((item) => item.scope === scope),
        { id, message, type, scope },
      ]);
    },
    [scope],
  );
  useEffect(() => {
    setStored((previous) => previous.filter((item) => item.scope === scope));
  }, [scope]);
  const removeToast = useCallback((id: string) => {
    setStored((previous) => previous.filter((toast) => toast.id !== id));
  }, []);
  return {
    toasts: stored.filter((toast) => toast.scope === scope),
    showToast,
    removeToast,
  };
};
