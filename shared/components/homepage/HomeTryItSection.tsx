"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, CalendarClock, FileCheck, PlayCircle, Receipt, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { JobJourney } from "@/shared/components/marketing/demos/JobJourney";
import { focusRing } from "@/shared/components/resources/tools/ToolControls";
import { VIDEO_PAGE_PATH } from "@/shared/lib/site/commercial-video";

/**
 * "Try it right here", the hands-on part of the homepage (2026-11-21).
 *
 * ============ WHY ============
 * 76 of the 84 visits that started on the homepage (28 days to 2026-11-20)
 * left after one page. The homepage showed five large still screenshots; the
 * software pages already had hands-on demos with sample data that nobody on
 * the homepage ever saw. This section puts those same demos one tap apart, so
 * a visitor can use the product before deciding anything, and each tab ends
 * with the page that covers that part in depth and the moment in the job video
 * where it happens: two honest reasons to open a second page.
 *
 * ============ WHAT IS REUSED ============
 * The four panels are the exact components the software pages render
 * (JobJourney on /hvac-software, EstimateDemo, DispatchDemo, InvoiceDemo).
 * Nothing in them calls a server, stores anything or sends anything. Only the
 * open tab is mounted; the three hands-on demos load when first opened, so the
 * homepage does not ship their code to visitors who never open them.
 *
 * Measuring: each tab press is counted as `cta_click` "home-demo-<id>" (the
 * site-wide data-track listener), and the demos count their own first use as
 * `calculator_used` with the homepage as the path.
 */

function DemoLoading() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-[520px] items-center justify-center rounded-2xl border border-[#e4d9c4] bg-white"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#c2a05a]/30 border-t-[#c2a05a]" />
    </div>
  );
}

const EstimateDemo = dynamic(
  () => import("@/shared/components/marketing/demos/EstimateDemo").then((module) => module.EstimateDemo),
  { loading: DemoLoading },
);
const DispatchDemo = dynamic(
  () => import("@/shared/components/marketing/demos/DispatchDemo").then((module) => module.DispatchDemo),
  { loading: DemoLoading },
);
const InvoiceDemo = dynamic(
  () => import("@/shared/components/marketing/demos/InvoiceDemo").then((module) => module.InvoiceDemo),
  { loading: DemoLoading },
);

type Tab = {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly icon: LucideIcon;
  readonly deeper: { readonly href: string; readonly label: string };
  /** The moment in the 2:27 job video where this part happens. */
  readonly video: { readonly seconds: number; readonly at: string };
};

const TABS: readonly Tab[] = [
  {
    id: "journey",
    label: "Walk one job",
    hint: "Five stops, real screens",
    icon: Route,
    deeper: { href: "/hvac-software", label: "How the whole system fits together" },
    video: { seconds: 51, at: "0:51" },
  },
  {
    id: "estimate",
    label: "Build an estimate",
    hint: "Price it, send it, get it signed",
    icon: FileCheck,
    deeper: { href: "/hvac-estimating-software", label: "HVAC estimating software" },
    video: { seconds: 59, at: "0:59" },
  },
  {
    id: "dispatch",
    label: "Run the board",
    hint: "Assign today's jobs",
    icon: CalendarClock,
    deeper: { href: "/hvac-dispatch-software", label: "HVAC dispatch software" },
    video: { seconds: 79, at: "1:19" },
  },
  {
    id: "invoice",
    label: "Invoice and get paid",
    hint: "From finished job to paid",
    icon: Receipt,
    deeper: { href: "/hvac-invoicing-software", label: "HVAC invoicing software" },
    video: { seconds: 99, at: "1:39" },
  },
];

function Panel({ id }: { readonly id: string }) {
  if (id === "estimate") return <EstimateDemo />;
  if (id === "dispatch") return <DispatchDemo />;
  if (id === "invoice") return <InvoiceDemo />;
  return <JobJourney />;
}

export function HomeTryItSection() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = TABS[active];

  const select = (index: number, focus: boolean) => {
    const next = (index + TABS.length) % TABS.length;
    setActive(next);
    if (focus) tabs.current[next]?.focus();
  };

  return (
    <section aria-labelledby="home-try-heading" className="px-5 pt-16 sm:px-8 sm:pt-24">
      <div className="mx-auto max-w-6xl">
        <div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
              Try it right here · no account
            </p>
            <h2
              id="home-try-heading"
              className="mt-3 scroll-mt-28 text-[1.6rem] font-semibold tracking-tight text-[#14120e] sm:text-[2.1rem]"
            >
              Use the software before you sign up for anything.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
              The same screens and steps your office and techs use, with a made-up HVAC company. Nothing you do here is
              saved or sent.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Parts of the software to try"
          className="mt-7 grid grid-cols-2 gap-2 lg:grid-cols-4"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") select(active + 1, true);
            if (event.key === "ArrowLeft") select(active - 1, true);
          }}
        >
          {TABS.map((item, index) => {
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
                id={`home-try-tab-${item.id}`}
                aria-selected={selected}
                aria-controls="home-try-panel"
                tabIndex={selected ? 0 : -1}
                data-track={`home-demo-${item.id}`}
                onClick={() => select(index, false)}
                className={`group flex min-h-[4.25rem] items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors sm:px-4 ${
                  selected
                    ? "border-[#14120e] bg-[#14120e] shadow-[0_16px_36px_-20px_rgba(20,18,14,0.75)]"
                    : "border-[#e4d9c4] bg-white hover:border-[#c2a05a] hover:shadow-[0_12px_28px_-20px_rgba(90,68,24,0.45)]"
                } ${focusRing} focus-visible:ring-offset-[#f5efe3]`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
                    selected
                      ? "bg-[#c2a05a] text-[#14120e] ring-[#e8d9ac]/40"
                      : "bg-[#f5ecd9] text-[#77591B] ring-[#e4d9c4]"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${selected ? "text-[#fff9ea]" : "text-[#14120e]"}`}>
                    {item.label}
                  </span>
                  <span className={`mt-0.5 hidden text-xs sm:block ${selected ? "text-[#c9bfae]" : "text-stone-500"}`}>{item.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="home-try-panel"
          role="tabpanel"
          aria-labelledby={`home-try-tab-${tab.id}`}
          className="mt-4"
        >
          <Panel id={tab.id} />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e4d9c4] bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Link
            href={tab.deeper.href}
            className={`inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#77591B] underline-offset-4 hover:text-[#14120e] hover:underline ${focusRing} focus-visible:ring-offset-white`}
          >
            {tab.deeper.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href={`${VIDEO_PAGE_PATH}?t=${tab.video.seconds}`}
            data-track={`home-demo-video-${tab.id}`}
            className={`inline-flex min-h-10 items-center gap-2 text-sm text-stone-600 hover:text-[#14120e] ${focusRing} focus-visible:ring-offset-white`}
          >
            <PlayCircle aria-hidden="true" className="h-4 w-4 text-[#a4823a]" />
            Watch this part in the job video
            <span className="font-semibold tabular-nums text-[#77591B]">{tab.video.at}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
