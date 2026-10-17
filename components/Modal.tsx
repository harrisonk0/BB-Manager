import React from "react";
import { TaskSheet } from "./ui";

/** Stable compatibility boundary: every production modal uses the shared native sheet. */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  dismissible?: boolean;
}
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  dismissible = true,
}: ModalProps) {
  return (
    <TaskSheet
      open={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      dismissible={dismissible}
    >
      {children}
    </TaskSheet>
  );
}
