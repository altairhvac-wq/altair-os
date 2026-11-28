"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, FileCheck, Receipt, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { focusRing } from "@/shared/components/resources/tools/ToolControls";
import { ProductScreenshotPlaceholder } from "@/shared/components/marketing/ProductScreenshotPlaceholder";
import { SHOWCASE_ITEMS } from "@/shared/components/marketing/SeeAltairInActionSection";

/**
 * "One job, five stops", the walk-through on /hvac-software.
 *
 * Each stop is one of the sample-company screenshots in
 * public/marketing/screenshots/tour (captured 2026-11-12, sample data only)
 * with what happens there and a link to the page and hands-on demo for that
 * part of the job. The copy only describes what the screenshot shows.
 */

type Stop = {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly shot: string;
  readonly title: string;
  readonly points: readonly string[];
  readonly href: string;
  readonly cta: string;
};

const STOPS: readonly Stop[] = [
  {
    id: "customer",
    label: "Customer",
    icon: Users,
    shot: "customer-360",
    title: "The call becomes a customer record",
    points: [
      "Contacts, addresses and the equipment on site in one place.",
      "Every job, estimate, invoice and payment for that customer underneath.",
      "The office and the technician read the same record.",
    ],
    href: "/hvac-estimating-software",
    cta: "Next: the estimate",
  },
  {
    id: "estimate",
    label: "Estimate",
    icon: FileCheck,
    shot: "estimates",
    title: "The estimate is approved on the customer's phone",
    points: [
      "Built from your price book, sent as a link.",
      "The customer approves and signs; the approval is saved.",
      "The approved estimate becomes the job.",
    ],
    href: "/hvac-estimating-software#estimating-demo",
    cta: "Try the estimate demo",
  },
  {
    id: "dispatch",
    label: "Dispatch",
    icon: CalendarClock,
    shot: "dispatch",
    title: "The job goes on the day's board",
    points: [
      "A row per technician, the unassigned queue beside it.",
      "Today's job addresses on a map of your service area.",
      "Assign or reassign; the technician sees it on their phone.",
    ],
    href: "/hvac-dispatch-software#dispatch-demo",
    cta: "Try the dispatch demo",
  },
  {
    id: "invoice",
    label: "Invoice",
    icon: Receipt,
    shot: "invoicing",
    title: "The finished job becomes the invoice",
    points: [
      "Drafted from the approved estimate when the job is completed.",
      "Emailed to the customer, paid by card from a link with Stripe connected.",
      "Cash and checks recorded against the same invoice.",
    ],
    href: "/hvac-invoicing-software#invoicing-demo",
    cta: "Try the invoicing demo",
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    shot: "reporting",
    title: "The money adds itself up",
    points: [
      "Collected, outstanding and overdue for the period you pick.",
      "Average ticket, estimate close rate and jobs completed.",
      "From the same records the team works in.",
    ],
    href: "/pricing#plan-finder",
    cta: "See what it costs for your team",
  },
];

export function JobJourney() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stop = STOPS[active];
  const shot = SHOWCASE_ITEMS.find((item) => item.id === stop.shot);

  const select = (index: number) => {
    const next = (index + STOPS.length) % STOPS.length;
    setActive(next);
    tabs.current[next]?.focus();
    trackEngagement("calculator_used", "job-journey");
  };

  return (
    <div id="journey" className="scroll-mt-24 overflow-hidden rounded-2xl border border-[rgba(230,227,220,0.14)] bg-[rgba(14,17,13,0.7)]">
      <div
        role="tablist"
        aria-label="Stops in one job"
        className="flex gap-1 overflow-x-auto border-b border-[rgba(230,227,220,0.1)] bg-[rgba(8,9,7,0.6)] p-2"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") select(active + 1);
          if (event.key === "ArrowLeft") select(active - 1);
        }}
      >
        {STOPS.map((item, index) => {
          const Icon = item.icon;
          const selected = index === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`journey-tab-${item.id}`}
              aria-selected={selected}
              aria-controls="journey-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold transition-colors ${
                selected ? "bg-[#f3ebdd] text-[#0d0f0c]" : "text-[#c9bfae] hover:bg-white/[0.06] hover:text-white"
              } ${focusRing} focus-visible:ring-offset-[#080907]`}
            >
              <span className={`font-mono text-[11px] ${selected ? "text-[#77591B]" : "text-[#8e826f]"}`}>{index + 1}</span>
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        id="journey-panel"
        role="tabpanel"
        aria-labelledby={`journey-tab-${stop.id}`}
        className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center"
      >
        <div className="min-w-0">
          {shot?.imageSrc ? (
            <ProductScreenshotPlaceholder alt={shot.imageAlt} label={shot.imageLabel} src={shot.imageSrc} mobileSrc={shot.imageSrcMobile} />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[#c2a05a]">
            STOP {active + 1} OF {STOPS.length}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#fff9ea] sm:text-2xl">{stop.title}</h3>
          <ul className="mt-4 space-y-2.5">
            {stop.points.map((point) => (
              <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-[#c9bfae] sm:text-[15px]">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c2a05a]" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={stop.href}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#a4823a] px-4 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] ${focusRing} focus-visible:ring-offset-[#080907]`}
            >
              {stop.cta}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            {active < STOPS.length - 1 ? (
              <button
                type="button"
                onClick={() => select(active + 1)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[rgba(230,227,220,0.2)] px-4 text-sm font-semibold text-[#fbf7ef] hover:border-[rgba(230,227,220,0.4)] ${focusRing} focus-visible:ring-offset-[#080907]`}
              >
                Next stop
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-[#8e826f]">Screens from a sample HVAC company; no real customers.</p>
        </div>
      </div>
    </div>
  );
}
