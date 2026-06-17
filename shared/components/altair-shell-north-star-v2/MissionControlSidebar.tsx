"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { missionConceptRoute, missionNavGroups } from "./nav-groups";

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === missionConceptRoute) {
    return pathname === missionConceptRoute;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MissionControlSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Altair mission control navigation"
      className="hidden w-[16rem] shrink-0 flex-col border-r border-slate-800/40 bg-gradient-to-b from-[#0a101c] via-[#0b1220] to-[#0f1729] lg:flex"
    >
      <div className="border-b border-slate-800/40 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.1)_inset]">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">Altair OS</p>
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Mission Control
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-7">
          {missionNavGroups.map((group) => (
            <li key={group.id}>
              <p className="mb-2.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                {group.label}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = isNavItemActive(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                          active
                            ? "bg-slate-800/70 text-white ring-1 ring-blue-500/25"
                            : "text-slate-500 hover:bg-slate-800/35 hover:text-slate-300"
                        }`}
                      >
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-400"
                          />
                        ) : null}
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active
                              ? "text-blue-400"
                              : "text-slate-500 group-hover:text-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-800/40 p-4">
        <div className="rounded-xl bg-slate-800/40 p-3.5 ring-1 ring-slate-700/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Concept · v2.3
            </p>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            Trades operating system art direction. Not linked in production nav.
          </p>
        </div>
      </div>
    </aside>
  );
}
