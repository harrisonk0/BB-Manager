import React, { useEffect, useId, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { Button, Toggle, List, Segmented, Searchbar } from "framework7-react";

export interface NativeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "plain";
  danger?: boolean;
  busy?: boolean;
}
/** Framework7's disabled prop adds a class; the adapter also disables the real button. */
export function NativeButton({
  children,
  variant = "primary",
  danger,
  busy,
  disabled,
  onClick,
  type = "button",
  className = "",
  ...attrs
}: NativeButtonProps) {
  const ref = useRef<{ el: HTMLElement }>(null);
  const blocked = Boolean(disabled || busy);
  useEffect(() => {
    const el = ref.current?.el;
    if (!el) return;
    el.toggleAttribute("disabled", blocked);
    for (const name of ["form", "name", "value", "title", "id"] as const) {
      const value = attrs[name];
      if (value == null) el.removeAttribute(name);
      else el.setAttribute(name, String(value));
    }
  }, [blocked, attrs.form, attrs.name, attrs.value, attrs.title, attrs.id]);
  return (
    <Button
      {...attrs}
      ref={ref}
      type={type}
      fill={variant === "primary"}
      round
      large
      disabled={blocked}
      aria-disabled={blocked || undefined}
      aria-busy={busy || undefined}
      className={`bb-button bb-button--${variant} ${danger ? "bb-button--danger" : ""} ${className}`}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          return;
        }
        onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
      }}
    >
      {busy && <span className="bb-spinner" aria-hidden="true" />}
      {children}
    </Button>
  );
}

export interface NativeSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
/** Uncontrolled native input plus instance sync avoids React19/F7 controlled-checkbox reset. */
export function NativeSwitch({
  label,
  checked,
  onChange,
  disabled,
}: NativeSwitchProps) {
  const ref =
    useRef<NonNullable<React.ComponentProps<typeof Toggle>["ref"]>["current"]>(
      null,
    );
  useEffect(() => {
    const input = ref.current?.el.querySelector("input");
    input?.setAttribute("aria-label", label);
    if (input) {
      input.disabled = Boolean(disabled);
      input.checked = checked;
    }
    const toggle = ref.current?.f7Toggle();
    if (toggle && toggle.checked !== checked) toggle.checked = checked;
  }, [checked, disabled, label]);
  return (
    <span className="bb-switch">
      <Toggle
        ref={ref}
        name={label}
        disabled={disabled}
        defaultChecked={checked}
        onChange={(event) => {
          if (!disabled) onChange(event.target.checked);
        }}
      />
    </span>
  );
}

export function GroupedList({
  title,
  footer,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      className={`bb-list-section ${className}`}
      aria-labelledby={title ? id : undefined}
    >
      {title && (
        <h2 id={id} className="bb-group-label">
          {title}
        </h2>
      )}
      <List strong inset dividersIos className="bb-grouped-list">
        <ul>{children}</ul>
      </List>
      {footer && <div className="bb-group-footer">{footer}</div>}
    </section>
  );
}
export interface SettingsRowProps {
  title: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
}
export function SettingsRow({
  title,
  detail,
  icon,
  trailing,
  onClick,
  destructive,
  className = "",
}: SettingsRowProps) {
  const content = (
    <>
      {icon && (
        <span className="item-media" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="item-inner">
        <span className="item-title-row">
          <span className="item-title">{title}</span>
        </span>
        {detail && <span className="item-footer bb-secondary">{detail}</span>}
        {(trailing || onClick) && (
          <span className="item-after">
            {trailing}
            {onClick && <ChevronRight size={18} aria-hidden="true" />}
          </span>
        )}
      </span>
    </>
  );
  return (
    <li
      className={`bb-settings-row ${destructive ? "bb-text-danger" : ""} ${className}`}
    >
      {onClick ? (
        <button
          type="button"
          className="item-content bb-settings-action external"
          onClick={onClick}
        >
          {content}
        </button>
      ) : (
        <div className="item-content">{content}</div>
      )}
    </li>
  );
}
export function NativeField({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  const generated = useId();
  const child = React.isValidElement<
    React.InputHTMLAttributes<HTMLInputElement>
  >(children)
    ? children
    : null;
  const controlId = htmlFor || child?.props.id || generated;
  const descriptionId = `${controlId}-description`;
  const describedBy =
    [child?.props["aria-describedby"], error || hint ? descriptionId : ""]
      .filter(Boolean)
      .join(" ") || undefined;
  const control = child
    ? React.cloneElement(child, {
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : child.props["aria-invalid"],
      })
    : children;
  return (
    <div className={`bb-field ${error ? "bb-field--invalid" : ""}`}>
      <label htmlFor={controlId}>{label}</label>
      {control}
      {(error || hint) && (
        <p
          id={descriptionId}
          className={error ? "bb-field-error" : "bb-field-hint"}
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
export interface NativeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}
export function NativeInput({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: NativeInputProps) {
  const generated = useId();
  const inputId = id || generated;
  const descriptionId = `${inputId}-description`;
  return (
    <div className={`bb-field ${error ? "bb-field--invalid" : ""}`}>
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        className={`bb-input ${className}`}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={
          [props["aria-describedby"], error || hint ? descriptionId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      {(error || hint) && (
        <p
          id={descriptionId}
          className={error ? "bb-field-error" : "bb-field-hint"}
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
export function NativeSegmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="bb-segmented" role="group" aria-label={label}>
      <Segmented strong round>
        {options.map((option) => (
          <Button
            type="button"
            key={option.value}
            active={value === option.value}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </Segmented>
    </div>
  );
}
export function NativeSearch({
  label = "Search",
  value,
  onChange,
  placeholder = label,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref =
    useRef<
      NonNullable<React.ComponentProps<typeof Searchbar>["ref"]>["current"]
    >(null);
  useEffect(() => {
    ref.current?.el.querySelector("input")?.setAttribute("aria-label", label);
  }, [label]);
  return (
    <Searchbar
      ref={ref}
      className="bb-search"
      inline
      customSearch
      backdrop={false}
      disableButton={false}
      clearButton={false}
      placeholder={placeholder}
      value={value}
      onInput={(event) => onChange(event.target.value)}
    />
  );
}
