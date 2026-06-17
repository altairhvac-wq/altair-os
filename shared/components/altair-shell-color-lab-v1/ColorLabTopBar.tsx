"use client";

import { Bell, ChevronDown, Radio } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { usePaletteTokens } from "./palette-context";

type ColorLabTopBarProps = {
  companyContext: ActiveCompanyContext;
  dateLabel: string;
};

export function ColorLabTopBar({ companyContext, dateLabel }: ColorLabTopBarProps) {
  const t = usePaletteTokens();
  const { company, user } = companyContext;
  const displayName = user.email?.split("@")[0] ?? "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className={t.topBar}>
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a2230] to-[#0F141B] text-xs font-bold text-slate-200 lg:hidden ${t.topBarAvatarRing}`}
        >
          A
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-100">{company.name}</p>
            <span className="hidden items-center gap-1 rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-600/20 sm:inline-flex">
              <Radio className="h-2.5 w-2.5" aria-hidden="true" />
              Live
            </span>
          </div>
          <p className="truncate text-[11px] text-slate-400">{dateLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-slate-400 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.06] hover:text-slate-200"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-white/[0.04] py-1.5 pl-1.5 pr-3 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.06]"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg bg-[#141B24] text-[10px] font-semibold text-slate-200 ${t.topBarAvatarRing}`}
          >
            {userInitials}
          </span>
          <span className="hidden text-sm font-medium text-slate-300 sm:inline">{displayName}</span>
          <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
