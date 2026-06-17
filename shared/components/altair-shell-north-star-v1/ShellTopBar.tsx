import { Bell, ChevronDown } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { shellTopBarClass } from "./shell-tokens";

type ShellTopBarProps = {
  companyContext: ActiveCompanyContext;
};

export function ShellTopBar({ companyContext }: ShellTopBarProps) {
  const { company, user } = companyContext;
  const displayName = user.email?.split("@")[0] ?? "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className={shellTopBarClass}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-sky-500 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)] lg:hidden">
          A
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{company.name}</p>
          <p className="truncate text-[11px] text-slate-500">Mission control · Tuesday, Jun 16</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/80 text-slate-400 ring-1 ring-slate-700/60 transition-colors hover:bg-slate-800/80 hover:text-slate-200"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-slate-900/80 py-1.5 pl-1.5 pr-3 ring-1 ring-slate-700/60 transition-colors hover:bg-slate-800/80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/80 to-slate-700 text-[10px] font-semibold text-white">
            {userInitials}
          </span>
          <span className="hidden text-sm font-medium text-slate-300 sm:inline">{displayName}</span>
          <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
