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
      className={`flex h-full w-64 shrink-0 flex-col border-r border-slate-800/90 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.35)] ${className}`.trim()}
    >
      <div className="border-b border-slate-800/80 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
          Altair OS
        </p>
        <p className="mt-1.5 text-sm font-medium text-slate-400">
          Admin Command Center
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-cyan-500/12 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)] ring-1 ring-cyan-500/20"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-cyan-400" : ""}`}
                  />
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
