"use client";

import { FlaskConical } from "lucide-react";
import { isAlphaHardeningEnabled } from "@/lib/beta/alpha-hardening";

export function AlphaStatusBanner() {
  if (!isAlphaHardeningEnabled()) {
    return null;
  }

  return (
    <div
      role="status"
      className="w-full max-w-full shrink-0 border-b border-sky-100/90 bg-gradient-to-r from-sky-50/90 to-cyan-50/50 px-4 py-2.5 text-sm text-sky-900 sm:px-6"
    >
      <div className="flex min-w-0 items-start gap-2">
        <FlaskConical
          className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
          aria-hidden="true"
        />
        <p className="min-w-0 break-words">
          <span className="font-semibold">Internal Alpha</span>
          {" — "}
          Some areas are intentionally hidden or marked Coming Soon while we
          harden core workflows.
        </p>
      </div>
    </div>
  );
}
