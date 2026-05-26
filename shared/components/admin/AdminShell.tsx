"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { getAdminNavItems, getNavItemForPath } from "./nav-items";
import { AlphaStatusBanner } from "./AlphaStatusBanner";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { Notification } from "@/shared/types/notification";

type AdminShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  notifications?: Notification[];
  unreadNotificationCount?: number;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  children,
  companyContext,
  userCompanies,
  notifications = [],
  unreadNotificationCount = 0,
}: AdminShellProps) {
  const pathname = usePathname();
  const mobileNavItems = getAdminNavItems(companyContext);
  const current = getNavItemForPath(pathname, companyContext);

  return (
    <div className="admin-canvas flex min-h-dvh md:h-dvh md:overflow-hidden">
      <Sidebar className="hidden md:flex" companyContext={companyContext} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          title={current.label}
          description={current.description}
          companyContext={companyContext}
          userCompanies={userCompanies}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
        />

        <AlphaStatusBanner />

        <nav
          aria-label="Mobile navigation"
          className="shrink-0 overflow-x-auto border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-sm md:hidden"
        >
          <ul className="flex gap-1.5 px-3 py-2.5">
            {mobileNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`block rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-cyan-500/12 text-cyan-800 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/15"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-h-0 flex-1 p-4 sm:p-6 lg:p-8 md:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
