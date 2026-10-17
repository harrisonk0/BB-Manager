import React, { useEffect, useId, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Sheet, f7ready } from "framework7-react";

// Leases survive overlapping exit/entry animations during task handoffs.
const inertLeases = new WeakMap<
  HTMLElement,
  { count: number; original: boolean }
>();
const activeSheets: HTMLElement[] = [];
function acquireInert(el: HTMLElement) {
  const lease = inertLeases.get(el);
  if (lease) lease.count += 1;
  else inertLeases.set(el, { count: 1, original: el.inert });
  el.inert = true;
}
function releaseInert(el: HTMLElement) {
  const lease = inertLeases.get(el);
  if (!lease) return;
  if (--lease.count === 0) {
    el.inert = lease.original;
    inertLeases.delete(el);
  }
}
function topSheet() {
  return activeSheets.filter((el) => el.isConnected).at(-1);
}

const focusableSelector = "a[href],button,input,select,textarea,[tabindex]";
export function containSheetFocus(root: HTMLElement, event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const controls = [
    ...root.querySelectorAll<HTMLElement>(focusableSelector),
  ].filter(
    (el) =>
      !el.matches(':disabled,[tabindex="-1"]') &&
      !el.closest("[inert],[hidden]") &&
      el.getClientRects().length &&
      getComputedStyle(el).visibility !== "hidden",
  );
  const first = controls[0],
    last = controls[controls.length - 1];
  if (!first) {
    event.preventDefault();
    root.querySelector<HTMLElement>("h2")?.focus();
    return;
  }
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      !controls.includes(document.activeElement as HTMLElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || !root.contains(document.activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
}
export interface TaskSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Gate native dismissal for a busy mutation or a bounded dirty editor; supply explicit Cancel/Discard actions. */
  dismissible?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "full";
}
/** One active task sheet. The shell marks all protected page content data-bb-app-surface. */
export function TaskSheet({
  open,
  onClose,
  title,
  children,
  actions,
  dismissible = true,
  className = "",
  size = "md",
}: TaskSheetProps) {
  const ref =
    useRef<NonNullable<React.ComponentProps<typeof Sheet>["ref"]>["current"]>(
      null,
    );
  const titleId = useId().replaceAll(":", "");
  const origin = useRef<HTMLElement | null>(null);
  const isolated = useRef<HTMLElement[]>([]);
  const leasedSheet = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const triggerCapturedAt = useRef(0);
  const canDismiss = useRef(dismissible);
  const destroying = useRef(false);
  canDismiss.current = dismissible;
  const restoreBackground = () => {
    for (const el of isolated.current) releaseInert(el);
    isolated.current = [];
    const index = activeSheets.indexOf(leasedSheet.current);
    if (index >= 0) activeSheets.splice(index, 1);
    leasedSheet.current = null;
  };
  const isolateBackground = () => {
    const el = ref.current?.el;
    if (!el || isolated.current.length) return;
    isolated.current = [
      ...document.querySelectorAll<HTMLElement>(
        ".view, [data-bb-app-surface], .bb-task-sheet.modal-in",
      ),
    ].filter((surface) => surface !== el && !surface.contains(el));
    for (const surface of isolated.current) acquireInert(surface);
    if (!activeSheets.includes(el)) activeSheets.push(el);
    leasedSheet.current = el;
  };
  const focusHeading = () => {
    const el = ref.current?.el;
    if (el && topSheet() === el && !el.contains(document.activeElement))
      el.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    let mounted = true;
    f7ready(() => {
      if (!mounted) return;
      const sheet = ref.current?.f7Sheet();
      if (!sheet) return;
      destroying.current = false;
      // Framework7 9.2 registers swipe cleanup on sheetDestroy, but its base
      // Modal.destroy emits sheetBeforeDestroy only. Bridge that missing event
      // before properties are deleted, including StrictMode's replay teardown.
      sheet.once("beforeDestroy", () => {
        destroying.current = true;
        (sheet.emit as (event: string) => void)("sheetDestroy");
        // Base destroy does not remove an open modal from its global registry.
        // Complete that lifecycle while fields still exist, without invoking
        // the caller's user-dismissal callback during React teardown.
        if (sheet.opened) sheet.close(false);
      });
    });
    return () => {
      mounted = false;
    };
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    // A lazy-loaded Sheet may open before the React ref is attached, so its
    // open/opened callbacks cannot be the sole accessibility initialization.
    isolateBackground();
    queueMicrotask(() => {
      if (ref.current?.f7Sheet()?.opened) focusHeading();
    });
  }, [open]);
  useLayoutEffect(() => {
    if (
      open &&
      !wasOpen.current &&
      Date.now() - triggerCapturedAt.current > 1000
    )
      origin.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    const captureOrigin = (event: Event) => {
      if (wasOpen.current || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(focusableSelector);
      if (target) {
        origin.current = target;
        triggerCapturedAt.current = Date.now();
      }
    };
    document.addEventListener("pointerdown", captureOrigin, true);
    document.addEventListener("click", captureOrigin, true);
    const dismissKey = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        wasOpen.current &&
        canDismiss.current &&
        topSheet() === ref.current?.el
      )
        ref.current?.f7Sheet()?.close();
    };
    const dismissBackdrop = (event: Event) => {
      const sheet = ref.current?.f7Sheet();
      if (
        wasOpen.current &&
        canDismiss.current &&
        topSheet() === ref.current?.el &&
        event.target === sheet?.backdropEl
      )
        sheet.close();
    };
    document.addEventListener("keydown", dismissKey);
    document.addEventListener("click", dismissBackdrop);
    const el = ref.current?.el;
    const trap = (event: KeyboardEvent) => {
      containSheetFocus(el!, event);
    };
    el?.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", dismissKey);
      document.removeEventListener("click", dismissBackdrop);
      document.removeEventListener("pointerdown", captureOrigin, true);
      document.removeEventListener("click", captureOrigin, true);
      el?.removeEventListener("keydown", trap);
      restoreBackground();
    };
  }, []);
  useLayoutEffect(() => {
    const sheet = ref.current?.f7Sheet();
    if (sheet) {
      // Escape/backdrop are owned by stable document listeners above. F7 attaches
      // those listeners conditionally at open and cannot safely toggle them later.
      sheet.params.closeOnEscape = false;
      sheet.params.closeByBackdropClick = false;
      sheet.params.swipeToClose = dismissible;
    }
  }, [dismissible, open]);
  const afterClose = () => {
    restoreBackground();
    if (destroying.current) return;
    onClose();
    const active = topSheet();
    if (active) {
      if (!active.contains(document.activeElement))
        active.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      return;
    }
    const trigger = origin.current;
    if (trigger?.isConnected && !trigger.closest("[inert],[hidden]")) {
      trigger.focus({ preventScroll: true });
      if (document.activeElement === trigger) return;
    }
    const main = document.querySelector<HTMLElement>(
      "[data-bb-app-surface] main, main[data-bb-app-surface], [data-bb-app-surface]",
    );
    if (main) {
      main.tabIndex = -1;
      main.focus({ preventScroll: true });
    }
  };
  const section =
    document.querySelector<HTMLElement>("[data-section]")?.dataset.section ||
    "company";
  return createPortal(
    <div
      id={`${titleId}-portal`}
      className="bb-sheet-portal"
      data-section={section}
    >
      <Sheet
        ref={ref}
        {...{
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titleId,
        }}
        opened={open}
        containerEl={`#${titleId}-portal`}
        backdrop
        closeByBackdropClick={false}
        closeOnEscape={false}
        swipeToClose
        swipeHandler={`#${titleId}-grab`}
        className={`bb-task-sheet bb-task-sheet--${size} ${className}`}
        onSheetOpen={() => {
          const sheet = ref.current?.f7Sheet();
          if (sheet) sheet.params.swipeToClose = canDismiss.current;
          isolateBackground();
        }}
        onSheetOpened={focusHeading}
        onSheetClosed={afterClose}
      >
        <div
          className="bb-sheet-grab"
          id={`${titleId}-grab`}
          aria-hidden="true"
        >
          <span />
        </div>
        <header className="bb-sheet-header">
          <h2 id={titleId} tabIndex={-1}>
            {title}
          </h2>
          <div className="bb-sheet-actions">
            {actions}
            <button
              type="button"
              aria-label="Close sheet"
              disabled={!dismissible}
              onClick={() => ref.current?.f7Sheet()?.close()}
              className="bb-sheet-close"
            >
              ×
            </button>
          </div>
        </header>
        <div className="bb-sheet-content">{children}</div>
      </Sheet>
    </div>,
    document.body,
  );
}
