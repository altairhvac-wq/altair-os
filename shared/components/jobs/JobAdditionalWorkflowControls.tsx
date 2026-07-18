"use client";

import type { ReactNode } from "react";

type JobAdditionalWorkflowControlsProps = {
  children: ReactNode;
  northStar?: boolean;
};

/**
 * Compact disclosure for secondary / admin workflow fallbacks.
 * Primary actions live in Next Action; these remain available for closed beta.
 */
export function JobAdditionalWorkflowControls({
  children,
  northStar = false,
}: JobAdditionalWorkflowControlsProps) {
  return (
    <details
      className={
        northStar
          ? "min-w-0 rounded-lg border border-dashed border-[rgba(138,99,36,0.22)] bg-[rgba(255,249,234,0.45)] open:bg-[rgba(255,249,234,0.7)]"
          : "w-full rounded-lg border border-dashed border-slate-200 bg-slate-50/70 open:bg-slate-50 lg:max-w-md"
      }
    >
      <summary
        className={
          northStar
            ? "cursor-pointer list-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6324] marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A44D] [&::-webkit-details-marker]:hidden"
            : "cursor-pointer list-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 [&::-webkit-details-marker]:hidden"
        }
      >
        More job controls
        <span
          className={
            northStar
              ? "ml-1.5 font-normal normal-case tracking-normal text-[#8A6324]/80"
              : "ml-1.5 font-normal normal-case tracking-normal text-slate-400"
          }
        >
          · secondary &amp; admin
        </span>
      </summary>
      <div
        className="space-y-2 border-t px-3 py-2.5 opacity-90"
        style={{
          borderColor: northStar
            ? "rgba(138,99,36,0.14)"
            : "rgb(226 232 240)",
        }}
        aria-label="Additional workflow controls"
      >
        {children}
      </div>
    </details>
  );
}
