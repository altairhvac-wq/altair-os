import { Bell, Search } from "lucide-react";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import { logoutAction } from "@/app/actions/auth";

type HeaderProps = {
  title: string;
  description?: string;
  companyContext: ActiveCompanyContext;
};

function getInitials(fullName: string | null, email: string | undefined) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }

  return (email?.slice(0, 2) ?? "U").toUpperCase();
}

export function Header({ title, description, companyContext }: HeaderProps) {
  const displayName =
    companyContext.profile.full_name ??
    companyContext.user.email ??
    "User";
  const initials = getInitials(
    companyContext.profile.full_name,
    companyContext.user.email,
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        {description ? (
          <p className="text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              {companyContext.company.name}
            </p>
            <p className="text-xs text-slate-500">
              {COMPANY_ROLE_LABELS[companyContext.role]}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white"
            title={displayName}
          >
            {initials}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
