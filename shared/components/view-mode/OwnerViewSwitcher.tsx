"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Eye } from "lucide-react";
import {
  OWNER_VIEW_MODE_DESCRIPTIONS,
  OWNER_VIEW_MODE_LABELS,
  type OwnerViewMode,
} from "@/shared/lib/owner-view-mode";

const VIEW_MODE_OPTIONS: OwnerViewMode[] = [
  "owner_admin",
  "technician",
  "dispatch",
];

type OwnerViewSwitcherProps = {
  viewMode: OwnerViewMode;
  onViewModeChange: (viewMode: OwnerViewMode) => void;
  tone?: "light" | "dark";
  className?: string;
};

export function OwnerViewSwitcher({
  viewMode,
  onViewModeChange,
  tone = "light",
  className = "",
}: OwnerViewSwitcherProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="View as"
        title="Preview navigation as another role. Your permissions stay owner-level."
        className={`flex max-w-[9.5rem] items-center gap-1 rounded-lg px-2 py-1 text-left transition-colors sm:max-w-[11rem] ${
          tone === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100"
        }`}
      >
        <Eye
          className={`hidden h-3.5 w-3.5 shrink-0 sm:block ${
            tone === "dark" ? "text-slate-500" : "text-slate-400"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[10px] font-semibold uppercase tracking-wide ${
              tone === "dark" ? "text-slate-500" : "text-slate-400"
            }`}
          >
            View as
          </span>
          <span
            className={`block truncate text-xs font-semibold ${
              tone === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {OWNER_VIEW_MODE_LABELS[viewMode]}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            tone === "dark" ? "text-slate-500" : "text-slate-400"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="View as"
          className="absolute right-0 z-40 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] leading-snug text-slate-500">
            Preview navigation only. Your owner permissions are unchanged.
          </p>
          {VIEW_MODE_OPTIONS.map((mode) => {
            const isActive = mode === viewMode;

            return (
              <button
                key={mode}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onViewModeChange(mode);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">
                    {OWNER_VIEW_MODE_LABELS[mode]}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {OWNER_VIEW_MODE_DESCRIPTIONS[mode]}
                  </span>
                </span>
                {isActive ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
