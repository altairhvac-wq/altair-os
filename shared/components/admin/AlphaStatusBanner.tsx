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
      className="shrink-0 border-b border-sky-100 bg-sky-50/80 px-4 py-2 text-sm text-sky-900 sm:px-6"
    >
      <div className="flex items-start gap-2">
        <FlaskConical
          className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
          aria-hidden="true"
        />
        <p>
          <span className="font-semibold">Internal Alpha</span>
          {" — "}
          Some areas are intentionally hidden or marked Coming Soon while we
          harden core workflows.
        </p>
      </div>
    </div>
  );
}
