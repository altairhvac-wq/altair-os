import { Bell, ChevronDown, Radio } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { missionTopBarClass } from "./mission-tokens";

type MissionTopBarProps = {
  companyContext: ActiveCompanyContext;
  dateLabel: string;
};

export function MissionTopBar({ companyContext, dateLabel }: MissionTopBarProps) {
  const { company, user } = companyContext;
  const displayName = user.email?.split("@")[0] ?? "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className={missionTopBarClass}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)] lg:hidden">
          A
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-100">{company.name}</p>
            <span className="hidden items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/20 sm:inline-flex">
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
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/70 text-slate-400 ring-1 ring-slate-700/50 transition-all hover:bg-slate-800/80 hover:text-slate-200 hover:ring-slate-600/50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-slate-900/70 py-1.5 pl-1.5 pr-3 ring-1 ring-slate-700/50 transition-all hover:bg-slate-800/80 hover:ring-slate-600/50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.3)]">
            {userInitials}
          </span>
          <span className="hidden text-sm font-medium text-slate-300 sm:inline">{displayName}</span>
          <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
