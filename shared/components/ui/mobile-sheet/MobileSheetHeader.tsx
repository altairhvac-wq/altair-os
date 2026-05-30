"use client";

import { X } from "lucide-react";

type MobileSheetHeaderProps = {
  icon: React.ReactNode;
  title: string;
  titleId: string;
  subtitle?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  trailing?: React.ReactNode;
  headerClassName?: string;
};

export function MobileSheetHeader({
  icon,
  title,
  titleId,
  subtitle,
  onClose,
  closeDisabled = false,
  trailing,
  headerClassName,
}: MobileSheetHeaderProps) {
  return (
    <header
      className={`flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-white px-3 py-2.5 sm:px-4 ${headerClassName ?? ""}`}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="text-base font-bold text-slate-900">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {trailing}
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}

/** Icon container used in sheet headers (h-10 w-10 rounded-xl). */
export function MobileSheetHeaderIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}
