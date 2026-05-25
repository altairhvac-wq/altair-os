"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { adminNavItems, getNavItemForPath } from "./nav-items";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

type AdminShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children, companyContext }: AdminShellProps) {
  const pathname = usePathname();
  const current = getNavItemForPath(pathname);

  return (
    <div className="flex h-dvh bg-slate-100 md:overflow-hidden">
      <Sidebar className="hidden md:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={current.label}
          description={current.description}
          companyContext={companyContext}
        />

        <nav
          aria-label="Mobile navigation"
          className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white md:hidden"
        >
          <ul className="flex gap-1 px-3 py-2">
            {adminNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-cyan-500/15 text-cyan-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="relative z-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
