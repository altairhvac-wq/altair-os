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
      className="hidden w-[16rem] shrink-0 flex-col border-r border-slate-800/50 bg-gradient-to-b from-[#04070d] via-[#060912] to-[#0a0f18] lg:flex"
    >
      <div className="border-b border-slate-800/50 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-sky-400 to-indigo-500 text-sm font-bold text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.35),0_0_0_1px_rgba(255,255,255,0.15)_inset]">
            A
            <span
              aria-hidden="true"
              className="absolute -inset-0.5 rounded-xl bg-cyan-400/20 blur-md"
            />
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
                            ? "bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-slate-900/70 text-white shadow-[0_0_24px_rgba(34,211,238,0.12),0_0_0_1px_rgba(34,211,238,0.25)_inset] ring-1 ring-cyan-500/30"
                            : "text-slate-500 hover:bg-slate-900/40 hover:text-slate-300"
                        }`}
                      >
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-cyan-300 to-indigo-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
                          />
                        ) : null}
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active
                              ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                              : "text-slate-500 group-hover:text-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium">{item.label}</span>
                        {active ? (
                          <span
                            className="ml-auto h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                            aria-hidden="true"
                          />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-800/50 p-4">
        <div className="rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-3.5 ring-1 ring-slate-700/40">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Concept · v2.2
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
