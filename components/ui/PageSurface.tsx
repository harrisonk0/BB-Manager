import React from "react";
import { Page, Navbar, NavRight } from "framework7-react";

/** A router page, never nest this inside another Page. Feature content uses PageBody. */
export function PageSurface({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Page
      className={`bb-page ${className}`}
      onPageBeforeIn={(page) => {
        page.el.inert = false;
      }}
      onPageBeforeOut={(page) => {
        page.el.inert = true;
      }}
    >
      <Navbar large largeTransparent title={title}>
        {actions && <NavRight>{actions}</NavRight>}
      </Navbar>
      <PageBody>
        <h1 className="bb-sr-only">{title}</h1>
        {subtitle && <p className="bb-page-subtitle">{subtitle}</p>}
        {children}
      </PageBody>
    </Page>
  );
}
export function PageBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`bb-page-body ${className}`}>{children}</div>;
}
export function InlineNotice({
  children,
  kind = "info",
  title,
}: {
  children: React.ReactNode;
  kind?: "info" | "error" | "success";
  title?: string;
}) {
  return (
    <div
      className={`bb-notice bb-notice--${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bb-empty-state">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="bb-loading" role="status">
      <span className="bb-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
export function SaveAccessory({
  dirty,
  saving,
  error,
  onSave,
  label = "Save changes",
}: {
  dirty: boolean;
  saving: boolean;
  error?: string;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="bb-save-accessory" aria-label="Save changes">
      <div role="status">
        {error ||
          (saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : "All changes saved")}
      </div>
      <button
        className="bb-save-button"
        type="button"
        disabled={!dirty || saving}
        onClick={onSave}
      >
        {saving ? "Saving…" : error ? "Retry save" : label}
      </button>
    </div>
  );
}
