import { Bell, ChevronDown } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";

type ShellTopBarProps = {
  companyContext: ActiveCompanyContext;
};

export function ShellTopBar({ companyContext }: ShellTopBarProps) {
  const { company, user } = companyContext;
  const displayName = user.email?.split("@")[0] ?? "User";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-sky-500 text-xs font-bold text-slate-950 lg:hidden">
          A
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{company.name}</p>
          <p className="truncate text-[11px] text-slate-500">Command center · Tuesday, Jun 16</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 transition-colors hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-400" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-slate-100 py-1.5 pl-1.5 pr-3 ring-1 ring-slate-200/80 transition-colors hover:bg-slate-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-semibold text-white">
            {userInitials}
          </span>
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">{displayName}</span>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
