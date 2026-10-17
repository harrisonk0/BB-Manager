import { useEffect } from "react";

/** Supported progressive enhancement; OS keyboard behaviour still needs device review. */
export function KeyboardViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      const active = document.activeElement;
      const editing =
        active instanceof HTMLElement &&
        (active.matches(
          "input:not([type=checkbox]):not([type=radio]),textarea",
        ) ||
          active.isContentEditable);
      // Pinch zoom also shrinks the visual viewport: never mistake it for a keyboard.
      const inset =
        editing && Math.abs(viewport.scale - 1) < 0.05
          ? Math.max(
              0,
              window.innerHeight - viewport.height - viewport.offsetTop,
            )
          : 0;
      root.style.setProperty("--bb-keyboard-inset", `${Math.round(inset)}px`);
      root.style.setProperty(
        "--bb-visual-height",
        `${Math.round(viewport.height)}px`,
      );
      root.toggleAttribute("data-bb-keyboard-open", inset > 80);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      root.style.removeProperty("--bb-keyboard-inset");
      root.style.removeProperty("--bb-visual-height");
      root.removeAttribute("data-bb-keyboard-open");
    };
  }, []);
  return null;
}
