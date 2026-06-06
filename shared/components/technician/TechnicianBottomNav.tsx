"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  getTechnicianNavItemForPath,
  getTechnicianNavItems,
} from "./nav-items";

type TechnicianBottomNavProps = {
  companyContext: ActiveCompanyContext;
};

export function TechnicianBottomNav({
  companyContext,
}: TechnicianBottomNavProps) {
  const pathname = usePathname();
  const navItems = getTechnicianNavItems(companyContext);
  const activeItem = getTechnicianNavItemForPath(pathname, companyContext);

  return (
    <nav
      aria-label="Technician navigation"
      className="tech-bottom-nav fixed inset-x-0 bottom-0 z-30"
    >
      <div className="tech-shell-nav-inner mx-auto flex items-stretch justify-around gap-0.5 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex min-h-[3.5rem] min-w-12 touch-manipulation flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 transition-colors ${
                isActive
                  ? "bg-cyan-50 text-cyan-700"
                  : "text-slate-500 hover:bg-slate-50/80 hover:text-slate-700 active:bg-slate-100/80"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="truncate text-[11px] font-semibold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
