"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getTechnicianNavItemForPath,
  technicianNavItems,
} from "./nav-items";

export function TechnicianBottomNav() {
  const pathname = usePathname();
  const activeItem = getTechnicianNavItemForPath(pathname);

  return (
    <nav
      aria-label="Technician navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
        {technicianNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItem.id;

          if (!item.enabled) {
            return (
              <span
                key={item.id}
                aria-disabled="true"
                title="Coming soon"
                className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-slate-300"
              >
                <Icon className="h-5 w-5" />
                <span className="truncate text-[10px] font-semibold">
                  {item.label}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 transition-colors ${
                isActive
                  ? "text-cyan-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="truncate text-[10px] font-semibold">
                {item.label}
              </span>
              {isActive ? (
                <span className="absolute bottom-1 h-1 w-8 rounded-full bg-cyan-600" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
