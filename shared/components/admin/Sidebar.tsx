"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import { getAdminNavItems } from "./nav-items";

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarProps = {
  className?: string;
  companyContext: ActiveCompanyContext;
};

export function Sidebar({ className = "", companyContext }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getAdminNavItems(companyContext);

  return (
    <aside
      className={`flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 ${className}`.trim()}
    >
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
          Altair OS
        </p>
        <p className="mt-1 text-sm font-medium text-slate-400">
          Admin Command Center
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-cyan-500/15 text-cyan-300"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {navItems.length <= 2 ? (
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-500">
            Your role has limited workspace access. Contact a company admin if
            you need additional modules.
          </p>
        </div>
      ) : null}
    </aside>
  );
}
