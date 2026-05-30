"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type BillingCollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function BillingCollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className = "",
}: BillingCollapsibleSectionProps) {
  return (
    <details
      className={`group rounded-lg border border-slate-200 bg-white ${className}`}
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 marker:content-none sm:px-4 sm:py-3 sm:text-sm [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-slate-100 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
        {children}
      </div>
    </details>
  );
}
