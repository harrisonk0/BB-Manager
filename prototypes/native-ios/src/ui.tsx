import React, { useEffect, useId, useRef } from "react";
import { Icon, type IconName } from "./icons";
import { initials } from "./data";
export function IconButton({
  icon,
  label,
  onClick,
  className = "",
  ...props
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`icon-button ${className}`}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "quiet";
}) {
  return (
    <button
      type="button"
      className={`button button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Avatar({
  name,
  squad = 1,
  small = false,
}: {
  name: string;
  squad?: number;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar avatar-${squad} ${small ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`segmented ${className}`}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1 tabIndex={-1} data-page-title>
          {title}
        </h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
export function SettingRow({
  icon,
  label,
  detail,
  onClick,
  danger,
  children,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  onClick?: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  const content = (
    <>
      <span className={`setting-icon ${danger ? "setting-icon-danger" : ""}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="setting-label">{label}</span>
      {children || (
        <>
          <span className="setting-detail">{detail}</span>
          <Icon name="chevron" size={17} />
        </>
      )}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`setting-row ${danger ? "text-danger" : ""}`}
    >
      {content}
    </button>
  ) : (
    <div className="setting-row">{content}</div>
  );
}
export function Switch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      className="switch-target"
      onClick={() => onChange(!value)}
    >
      <span className="switch-track">
        <span />
      </span>
    </button>
  );
}
export function Sheet({
  title,
  children,
  onClose,
  footer,
  full = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  full?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const closeOnBack = () => closeRef.current();
    window.addEventListener("popstate", closeOnBack);
    dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>("[data-sheet-heading]")?.focus();
    return () => {
      window.removeEventListener("popstate", closeOnBack);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={`sheet ${full ? "sheet-full" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            closeRef.current();
        }
      }}
    >
      <div className="sheet-handle" aria-hidden="true" />
      <header className="sheet-header">
        <h2 id={id} tabIndex={-1} data-sheet-heading>
          {title}
        </h2>
        <IconButton icon="close" label={`Close ${title}`} onClick={onClose} />
      </header>
      <div className="sheet-content">{children}</div>
      {footer && <footer className="sheet-footer">{footer}</footer>}
    </dialog>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">
        <Icon name="search" size={28} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
