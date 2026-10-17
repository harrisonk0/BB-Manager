import React, { useEffect } from "react";
import { ToastMessage } from "../types";
import { NativeButton } from "./ui";
import { CheckCircleIcon, XCircleIcon, InfoCircleIcon, XIcon } from "./Icons";

const ICONS = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InfoCircleIcon,
};
export default function Toast({
  toast,
  removeToast,
}: {
  toast: ToastMessage;
  removeToast: (id: string) => void;
}) {
  useEffect(() => {
    // Errors remain until dismissed so failures are not lost while entering data.
    if (toast.type === "error") return;
    const timer = window.setTimeout(() => removeToast(toast.id), 5000);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.type, removeToast]);
  const Icon = ICONS[toast.type];
  return (
    <div
      className={`bb-toast bb-toast--${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <Icon className="bb-toast-icon" aria-hidden="true" />
      <p>{toast.message}</p>
      <NativeButton
        variant="plain"
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
      >
        <XIcon className="bb-toast-icon" aria-hidden="true" />
      </NativeButton>
    </div>
  );
}
