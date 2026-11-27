"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, History, X } from "lucide-react";
import { forgetCarried, useCarried, CARRY_SOURCE_NAMES } from "@/shared/components/resources/calc/carry";
import { focusRing, readStorage, removeStorage } from "@/shared/components/resources/tools/ToolControls";
import { STORAGE_KEY as WORKSPACE_STORAGE_KEY } from "@/shared/components/resources/labor/labor-state";
import { CALCULATOR_STORAGE_PREFIX } from "@/shared/components/resources/calc/useCalculatorTool";
import { calculatorPath, type ResourceCalculatorEntry } from "@/shared/lib/resources/catalog";

/**
 * "Your numbers": what a returning owner already has in this browser, shown
 * at the top of the free tools pages.
 *
 * ============ WHY ============
 * The 2026-11-27 audit found nothing on the site invited a second visit. The
 * tools already save numbers in the visitor's browser and hand the labor
 * rate from one tool to the next, but a returning owner had to open a tool
 * to find that out. This reads the same browser storage the tools write and
 * says: your rate is still here, these tools hold your numbers, this is the
 * next one worth running.
 *
 * ============ NOTHING LEAVES THE BROWSER ============
 * It only reads localStorage, after the page has loaded, and sends nothing
 * anywhere. With nothing saved it renders nothing, so a first-time visitor
 * (and a search engine) sees the page exactly as before.
 */

type Slug = ResourceCalculatorEntry["slug"];

/** The order the tools are worth running in, and the short name each goes by. */
const TOOLS: readonly { readonly id: Slug | "workspace"; readonly name: string; readonly href: string; readonly why: string }[] = [
  { id: "workspace", name: "Labor rate calculator", href: "/insights/how-to-calculate-hvac-labor-rate", why: "Every other tool is priced from your labor rate." },
  { id: "break-even", name: "Break-even", href: calculatorPath("break-even"), why: "See how many jobs a month cover your costs at that rate." },
  { id: "service-call-fee", name: "Service call fee", href: calculatorPath("service-call-fee"), why: "Check the fee you charge at the door against that rate." },
  { id: "job-profitability", name: "Job profitability", href: calculatorPath("job-profitability"), why: "Check whether a finished job really made money." },
  { id: "maintenance-agreement", name: "Maintenance agreement pricing", href: calculatorPath("maintenance-agreement"), why: "Price an agreement from what the visits cost you." },
  { id: "technician-pay", name: "Technician pay", href: calculatorPath("technician-pay"), why: "Compare hourly, flat rate and commission on one real week." },
  { id: "hiring-a-technician", name: "Hiring a technician", href: calculatorPath("hiring-a-technician"), why: "See how many billed hours a week another technician needs to pay for themselves." },
  { id: "callback-cost", name: "Callback cost", href: calculatorPath("callback-cost"), why: "Put a number on free return trips." },
  { id: "labor-rate", name: "Quick labor rate", href: calculatorPath("labor-rate"), why: "One technician's rate from six numbers." },
];

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const money = (value: number, digits = 2) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

function storageKeyOf(id: Slug | "workspace"): string {
  return id === "workspace" ? WORKSPACE_STORAGE_KEY : CALCULATOR_STORAGE_PREFIX + id;
}

export function YourNumbers({ className = "" }: { readonly className?: string }) {
  const carried = useCarried();
  const [saved, setSaved] = useState<readonly (Slug | "workspace")[]>([]);
  // The time is read once the page is in the browser, never while rendering.
  const [now, setNow] = useState<number | null>(null);
  // "Forget them all" removes saved work, so it asks once before doing it.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const read = () => {
      setSaved(TOOLS.filter((tool) => readStorage(storageKeyOf(tool.id)) !== null).map((tool) => tool.id));
      setNow(Date.now());
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  if (!carried && saved.length === 0) return null;

  const hasRate = Boolean(carried);
  // The next tool worth opening: the labor rate first, then the first tool in order with nothing saved yet.
  const next = !hasRate && !saved.includes("workspace") ? TOOLS[0] : TOOLS.filter((tool) => tool.id !== "workspace" && tool.id !== "labor-rate").find((tool) => !saved.includes(tool.id)) ?? null;
  const savedTools = TOOLS.filter((tool) => saved.includes(tool.id));
  const stale = carried && now !== null ? now - carried.savedAt > YEAR_MS : false;
  const savedOn = carried ? new Date(carried.savedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

  const forgetAll = () => {
    for (const tool of TOOLS) removeStorage(storageKeyOf(tool.id));
    forgetCarried();
    setSaved([]);
    setConfirming(false);
  };

  return (
    <section aria-labelledby="your-numbers-heading" className={`rounded-2xl border border-[#C2A05A]/50 bg-amber-50/60 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
            <History aria-hidden="true" className="h-3.5 w-3.5" /> Welcome back
          </p>
          <h2 id="your-numbers-heading" className="mt-1 text-lg font-semibold tracking-tight text-[#0A0A0A] sm:text-xl">
            Your numbers are still here.
          </h2>
        </div>
        {confirming ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-stone-700" role="alert">
            Remove everything saved in this browser?
            <button type="button" onClick={forgetAll} className={`inline-flex min-h-9 items-center rounded font-semibold text-red-700 hover:underline ${focusRing}`}>
              Yes, forget it
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={`inline-flex min-h-9 items-center rounded font-semibold text-stone-700 hover:underline ${focusRing}`}>
              Keep it
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`inline-flex min-h-9 items-center gap-1 rounded text-[13px] font-semibold text-stone-600 hover:text-stone-900 hover:underline ${focusRing}`}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" /> Forget them all
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {carried ? (
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Your labor rate</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-stone-900">{money(carried.billedRate, 0)}</span>
              <span className="text-sm text-stone-600">an hour · break-even {money(carried.costPerBilledHour)}</span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
              Worked out {savedOn} in the {CARRY_SOURCE_NAMES[carried.source] === "Labor Cost Workspace" ? "Labor rate calculator" : CARRY_SOURCE_NAMES[carried.source]}.
              {stale ? " That is over a year ago. Wages, insurance and payroll tax limits change every January: run it again with this year's numbers." : ""}
            </p>
            <Link
              href={carried.source === "labor-workspace" ? TOOLS[0].href : calculatorPath("labor-rate")}
              data-track="your-numbers-rate"
              className={`mt-2 inline-flex min-h-9 items-center gap-1 rounded text-[13px] font-semibold text-[#77591B] hover:underline ${focusRing}`}
            >
              {stale ? "Re-check my rate" : "Open it"} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        <div className={`rounded-xl border border-stone-200 bg-white p-4 ${carried ? "" : "md:col-span-2"}`}>
          {savedTools.length > 0 ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Saved in this browser</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {savedTools.map((tool) => (
                  <li key={tool.id}>
                    <Link
                      href={tool.href}
                      data-track="your-numbers-saved"
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border border-stone-300 bg-stone-50 px-3.5 text-[13px] font-semibold text-stone-800 hover:border-[#C2A05A] hover:bg-white ${focusRing}`}
                    >
                      {tool.name} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-[#77591B]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {next ? (
            <p className={`text-[13px] leading-relaxed text-stone-700 ${savedTools.length > 0 ? "mt-3 border-t border-stone-100 pt-3" : ""}`}>
              <span className="font-semibold text-stone-900">Next: </span>
              <Link href={next.href} data-track="your-numbers-next" className={`rounded font-semibold text-[#77591B] underline underline-offset-2 ${focusRing}`}>
                {next.name}
              </Link>
              . {next.why}
              {hasRate && next.id !== "technician-pay" ? " Your labor rate is offered there with one press." : ""}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-stone-500">Kept in this browser only. Nothing here was sent to us, and clearing your browser data removes it.</p>
    </section>
  );
}
