"use client";

import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SettingsFutureCard } from "./SettingsFutureCard";

export type ComingSoonItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type SettingsComingSoonSectionProps = {
  items: ComingSoonItem[];
  northStar?: boolean;
};

export function SettingsComingSoonSection({
  items,
  northStar = false,
}: SettingsComingSoonSectionProps) {
  const count = items.length;

  if (northStar) {
    return (
      <>
        <details className="group min-w-0 overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] md:hidden">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-sm font-semibold text-[#17130E]">
                Coming soon
              </span>
              <span className="text-xs text-[#4F4638]">{count} planned</span>
            </div>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[#8A6324] transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="divide-y divide-[rgba(138,99,36,0.10)] border-t border-[rgba(138,99,36,0.12)]">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <li
                  key={item.title}
                  className="flex items-center gap-2.5 px-3 py-2"
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-[#8A6324]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#4F4638]">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[#4F4638]">
                    Soon
                  </span>
                </li>
              );
            })}
          </ul>
        </details>

        <div className="hidden min-w-0 gap-2.5 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <SettingsFutureCard
              key={item.title}
              title={item.title}
              description={item.description}
              icon={item.icon}
              northStar
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <details className="group admin-card min-w-0 overflow-hidden md:hidden">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900">
              Coming soon
            </span>
            <span className="text-xs text-slate-500">{count} planned</span>
          </div>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <li
                key={item.title}
                className="flex items-center gap-2.5 px-3 py-2"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {item.title}
                </span>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Soon
                </span>
              </li>
            );
          })}
        </ul>
      </details>

      <div className="hidden min-w-0 gap-2.5 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <SettingsFutureCard
            key={item.title}
            title={item.title}
            description={item.description}
            icon={item.icon}
          />
        ))}
      </div>
    </>
  );
}
