"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Menu } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { AdminQuickNavDrawer } from "@/shared/components/admin/AdminQuickNavDrawer";

const GLASS_BUTTON_CLASS =
  "inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-2xl bg-white/[0.08] text-[#d7d3cc] ring-1 ring-inset ring-white/[0.12] transition-colors hover:text-white active:bg-white/[0.16] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2a05a]";

type AdminMobileHomeTopBarProps = {
  companyContext: ActiveCompanyContext;
  dateEyebrow: string | null;
  greeting: string;
};

/**
 * Top control row of the mobile home launcher: the sidebar button (opens
 * the full admin navigation drawer) on the left, the date + greeting
 * sandwiched in the middle, today's-schedule calendar on the right.
 * Client component — owns the drawer open state.
 */
export function AdminMobileHomeTopBar({
  companyContext,
  dateEyebrow,
  greeting,
}: AdminMobileHomeTopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        aria-controls="quick-navigation-drawer"
        onClick={() => setDrawerOpen(true)}
        className={GLASS_BUTTON_CLASS}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1 text-center">
        {dateEyebrow ? (
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c2a05a]">
            {dateEyebrow}
          </p>
        ) : null}
        <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-white">
          {greeting}
        </p>
      </div>

      <Link
        href="/schedule"
        aria-label="Today's schedule"
        className={GLASS_BUTTON_CLASS}
      >
        <CalendarDays className="h-5 w-5" aria-hidden />
      </Link>

      <AdminQuickNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        companyContext={companyContext}
      />
    </div>
  );
}
