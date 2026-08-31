"use client";

import Link from "next/link";
import { X, type LucideIcon } from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { MobileSideDrawer } from "@/shared/components/ui/mobile-drawer";

export type QuickNavDrawerItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
};

export type QuickNavDrawerGroup = {
  id: string;
  label: string;
  items: QuickNavDrawerItem[];
};

type QuickNavigationDrawerProps = {
  open: boolean;
  onClose: () => void;
  companyName: string;
  groups: QuickNavDrawerGroup[];
};

const TITLE_ID = "quick-navigation-drawer-title";

export function QuickNavigationDrawer({
  open,
  onClose,
  companyName,
  groups,
}: QuickNavigationDrawerProps) {
  return (
    <MobileSideDrawer
      open={open}
      onClose={onClose}
      ariaLabelledBy={TITLE_ID}
      zIndex={50}
    >
      <div
        id="quick-navigation-drawer"
        className="flex h-full min-h-0 flex-col pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 pb-3.5 pt-1.5">
          <AltairLogo variant="gold" size="sm" showWordmark={false} />
          <div className="min-w-0 flex-1">
            <p
              id={TITLE_ID}
              className="truncate text-sm font-bold tracking-tight text-white"
            >
              {companyName}
            </p>
            <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-[#c2a05a]">
              Navigation
            </p>
          </div>
          <button
            type="button"
            data-mobile-sheet-initial-focus
            aria-label="Close quick navigation"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-[#9b9fa6] transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2a05a]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Quick navigation destinations"
          data-testid="quick-nav-drawer"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        >
          <ul className="flex flex-col gap-6">
            {groups.map((group) => (
              <li key={group.id}>
                <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          aria-current={item.active ? "page" : undefined}
                          onClick={onClose}
                          className={`flex min-h-11 touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2a05a] ${
                            item.active
                              ? "bg-[#c2a05a]/[0.14] font-semibold text-white ring-1 ring-inset ring-[#c2a05a]/25"
                              : "font-medium text-[#cdc9c2] hover:bg-white/[0.06] hover:text-white active:bg-white/[0.1]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              item.active ? "text-[#c2a05a]" : "text-[#82868c]"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
                          {item.active ? (
                            <span
                              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#c2a05a]"
                              aria-hidden
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
      </div>
    </MobileSideDrawer>
  );
}
