"use client";

import { Menu, X } from "lucide-react";

type QuickNavToggleProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

/**
 * Compact top-left control that opens/closes the Quick Navigation drawer.
 * Sized for a 44×44 CSS-pixel touch target.
 */
export function QuickNavToggle({
  open,
  onOpenChange,
  className = "",
}: QuickNavToggleProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="quick-navigation-drawer"
      aria-label={open ? "Close quick navigation" : "Open quick navigation"}
      onClick={() => onOpenChange(!open)}
      className={`inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${
        open ? "relative z-[70] bg-slate-100 text-slate-900" : ""
      } ${className}`}
    >
      {open ? (
        <X className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Menu className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
