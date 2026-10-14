"use client";
// A small button-anchored popover. Fixed positioning keeps it from being clipped by
// scrolling containers such as the sidebar list. Escape or an outside click closes it,
// and focus returns to the button.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export default function Popover({
  label,
  buttonContent,
  buttonClassName,
  buttonTitle,
  panelRole = "group",
  panelLabel,
  width = 224,
  children,
}: {
  /** Accessible name of the trigger button. Omit when buttonContent is visible text. */
  label?: string;
  buttonContent: React.ReactNode;
  buttonClassName?: string;
  buttonTitle?: string;
  panelRole?: "group" | "dialog";
  panelLabel: string;
  width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = useCallback(() => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(width, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    setPos({ top: r.bottom + 4, left, width: w });
  }, [width]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const onResize = () => close(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, close, place]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open && pos) panel.current?.querySelector<HTMLElement>("a[href], button:not([disabled]), input, select")?.focus();
  }, [open, pos]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={buttonTitle}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup={panelRole === "dialog" ? "dialog" : "true"}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {open && pos && (
        <div
          id={id}
          ref={panel}
          role={panelRole}
          aria-label={panelLabel}
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 rounded-lg bg-white p-1 text-sm text-ink shadow-lg ring-1 ring-black/10"
        >
          {children(() => close())}
        </div>
      )}
    </>
  );
}

/** Shared item style for actions inside a popover. */
export const menuItemClass =
  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-hover disabled:opacity-50";
