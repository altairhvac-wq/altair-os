import type { Metadata } from "next";
import { swipeItem, swipeRow } from "@/shared/components/marketing/phone/phone-classes";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Library, MapPin, Sigma, type LucideIcon } from "lucide-react";
import { ToolCard } from "@/shared/components/resources/hub/ToolCards";
import { YourNumbers } from "@/shared/components/resources/hub/YourNumbers";
import { ResourceChrome } from "@/shared/components/resources/ResourcePageShell";
import { NextStep } from "@/shared/components/site/NextStep";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  RESOURCE_CALCULATORS,
  CALCULATOR_DISCLAIMER,
  RESOURCES_CALCULATORS_PATH,
  RESOURCES_GUIDES_PATH,
  RESOURCES_HUB_DESCRIPTION,
  RESOURCES_LIBRARY_PATH,
  RESOURCES_PATH,
} from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import {
  FIRST_TIME_PATH,
  HUB_TOOLS,
  INTERACTIVE_TOOL_COUNT,
  TOOL_JOBS,
  TOOL_UPDATES,
  hubTool,
  toolsForJob,
  type ToolJob,
} from "@/shared/lib/resources/tool-hub";
import { GUIDES, NEXT_STEPS, type NextStepItem } from "@/shared/lib/site/next-steps";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { DIRECTORY_PATH } from "@/shared/types/directory";

/**
 * /resources: the free tools hub.
 *
 * ============ WHY IT CHANGED ============
 * The 2026-11-20 site audit found this page was a list of headings and links
 * that left out the two workspaces and the technician pay calculator, and
 * that 149 of 162 visits never saw a second page. It is now the place a
 * visitor who came for one calculator finds the rest: every tool as a card
 * with what it solves, how long it takes and a preview of its own worked
 * example, grouped by the job it helps with, plus a three-step path for an
 * owner doing this for the first time.
 *
 * The address is kept (Google already knows it, and robots.ts allows
 * /resources). Static: every number on the page is computed at build time
 * from the tools' own functions in shared/lib/resources/tool-hub.ts.
 */

const TITLE = "Free HVAC Business Tools";
const H1 = "Free tools for HVAC business owners";

export const metadata: Metadata = {
  title: TITLE,
  description: RESOURCES_HUB_DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_PATH,
    title: TITLE,
    description: RESOURCES_HUB_DESCRIPTION,
  }),
};

/** One hand-picked guide beside the tools of each job (the price group is full with three tools). */
const JOB_GUIDE: Partial<Record<ToolJob, NextStepItem>> = {
  team: GUIDES.startAndGrow,
  paid: GUIDES.whatOnInvoice,
  plan: GUIDES.breakEven,
};

const MORE: readonly { href: string; title: string; text: string; icon: LucideIcon }[] = [
  {
    href: RESOURCES_CALCULATORS_PATH,
    title: `All ${RESOURCE_CALCULATORS.length} calculators`,
    text: "Side by side, with the order to run them in.",
    icon: Sigma,
  },
  {
    href: RESOURCES_GUIDES_PATH,
    title: "New owner? Start here",
    text: "The guides and tools a new owner needs, in order.",
    icon: BookOpen,
  },
  {
    href: RESOURCES_LIBRARY_PATH,
    title: "Videos and articles",
    text: "Search the guides and both YouTube channels at once.",
    icon: Library,
  },
  {
    href: DIRECTORY_PATH,
    title: "Contractor directory",
    text: "Find trade contractors by city, or list your business free.",
    icon: MapPin,
  },
];

/** The first-time path, end to end, from each tool's own estimate. */
const FIRST_PATH_MINUTES = FIRST_TIME_PATH.reduce((sum, step) => sum + hubTool(step.toolId).minutes, 0);

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

export default function ResourcesHubPage() {
  return (
    <ResourceChrome>
      <main className="relative mx-auto max-w-[90rem] px-4 pb-20 pt-24 sm:px-8 sm:pt-28 lg:px-12">
        <JsonLdScript
          data={buildResourceCollectionStructuredData({
            name: H1,
            description: RESOURCES_HUB_DESCRIPTION,
            path: RESOURCES_PATH,
            parts: HUB_TOOLS.map((tool) => ({ name: tool.title, path: tool.href })),
          })}
        />

        {/* ---------- hero ---------- */}
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
              Free tools · no account
            </p>
            <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.08] tracking-tight text-[#0A0A0A] sm:text-[3rem]">
              {H1}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
              {INTERACTIVE_TOOL_COUNT} tools for the business side of the trade: what to charge, what to pay, how to
              bill it and how many jobs cover the month. Each one opens with a worked example, shows its math, and
              keeps your numbers in your own browser.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-stone-600">
              {["No sign-up, no email, no phone number", "Your numbers carry from one tool to the next", "Save, share a link or print as PDF"].map((fact) => (
                <li key={fact} className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Tools by job" className="rounded-2xl border border-stone-200 bg-white/80 p-2 shadow-sm">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Jump to a job
            </p>
            <ul className="grid grid-cols-2 gap-1">
              {TOOL_JOBS.map((job, index) => (
                <li key={job.id}>
                  <a
                    href={`#job-${job.id}`}
                    className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-stone-800 transition-colors hover:bg-stone-100 ${focusRing}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#77591B]">{String(index + 1).padStart(2, "0")}</span>
                      {job.title}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-stone-500">
                      {toolsForJob(job.id).length}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        {/* ---------- returning owner: what is already saved in this browser (renders nothing for a first visit) ---------- */}
        <YourNumbers className="mt-10" />

        {/* ---------- what changed lately ---------- */}
        <section aria-labelledby="tool-updates-heading" className="mt-8 rounded-2xl border border-stone-200 bg-white/80 px-5 py-4 sm:px-6">
          <h2 id="tool-updates-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
            New in the tools
          </h2>
          <ul className="mt-2 divide-y divide-stone-100">
            {TOOL_UPDATES.slice(0, 3).map((update) => (
              <li key={update.text}>
                <Link href={update.href} data-track="tools-new" className={`group flex items-start gap-3 rounded-lg py-2.5 ${focusRing}`}>
                  <time dateTime={update.iso} className="w-14 shrink-0 pt-0.5 font-mono text-[11px] text-stone-500">
                    {update.label}
                  </time>
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-stone-700 group-hover:text-stone-900">{update.text}</span>
                  <ArrowRight aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-[#77591B] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- first-time owner path ---------- */}
        <section
          aria-labelledby="start-here-heading"
          className="mt-12 overflow-hidden rounded-[1.4rem] bg-[#0d0f0c] px-5 py-7 text-[#f3ebdd] shadow-[0_40px_100px_-60px_rgba(0,0,0,0.8)] sm:px-8 sm:py-9"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
                Running your own shop for the first time?
              </p>
              <h2 id="start-here-heading" className="mt-2 text-[1.4rem] font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">
                Start here: three tools, in this order.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#a99f8f]">
              Each one uses the number the one before it gives you. About {FIRST_PATH_MINUTES} minutes for all three.
            </p>
          </div>
          <ol className="mt-7 grid gap-3 md:grid-cols-3 md:gap-0">
            {FIRST_TIME_PATH.map((step, index) => {
              const tool = hubTool(step.toolId);
              const last = index === FIRST_TIME_PATH.length - 1;
              return (
                <li key={step.toolId} className="relative md:pr-6">
                  {!last ? (
                    <span
                      aria-hidden="true"
                      className="absolute right-0 top-5 hidden h-px w-6 bg-gradient-to-r from-[#c2a05a]/60 to-transparent md:block"
                    />
                  ) : null}
                  <Link
                    href={tool.href}
                    data-track={`next-tool-${tool.id}`}
                    className={`group flex h-full flex-col rounded-xl border border-[rgba(230,227,220,0.12)] bg-[rgba(24,28,22,0.55)] p-5 transition-colors hover:border-[#c2a05a]/60 ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a4823a] text-sm font-semibold text-[#080907]">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c2a05a]">{step.step}</span>
                    </span>
                    <span className="mt-3 block text-base font-semibold text-[#fff9ea]">{tool.title}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-[#c9bfae]">{step.why}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-[13px]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#e8d9ac]">
                        Open it
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <span className="text-xs text-[#8e826f]">About {tool.minutes} min</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ---------- tools by job ---------- */}
        <div className="mt-14 space-y-14 sm:mt-16 sm:space-y-16">
          {TOOL_JOBS.map((job, index) => {
            const tools = toolsForJob(job.id);
            const guide = JOB_GUIDE[job.id];
            return (
              <section key={job.id} id={`job-${job.id}`} aria-labelledby={`job-${job.id}-heading`} className="scroll-mt-24">
                <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
                  <div>
                    <p className="font-mono text-xs font-semibold text-[#77591B]">{String(index + 1).padStart(2, "0")}</p>
                    <h2 id={`job-${job.id}-heading`} className="mt-1 text-[1.5rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[1.85rem]">
                      {job.title}
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">{job.text}</p>
                  </div>
                </div>
                <ul className={`mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${swipeRow}`}>
                  {tools.map((tool) => (
                    <li key={tool.id} className={`min-w-0 ${swipeItem}`}>
                      <ToolCard tool={tool} featured />
                    </li>
                  ))}
                  {guide ? (
                    <li className={`min-w-0 ${swipeItem}`}>
                      <Link
                        href={guide.href}
                        data-track={`next-guide-${guide.id}`}
                        className={`group flex h-full flex-col justify-between rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-5 transition-colors hover:border-[#c2a05a] hover:bg-white ${focusRing}`}
                      >
                        <span>
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#77591B] ring-1 ring-inset ring-stone-200">
                              <BookOpen aria-hidden="true" className="h-4 w-4" />
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">The guide</span>
                          </span>
                          <span className="mt-3 block text-base font-semibold leading-snug text-[#0A0A0A]">{guide.title}</span>
                          <span className="mt-1.5 block text-sm leading-relaxed text-stone-600">{guide.text}</span>
                        </span>
                        <span className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#77591B]">
                          Read the guide
                          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>

        {/* ---------- more ---------- */}
        <section aria-labelledby="more-resources-heading" className="mt-16">
          <h2 id="more-resources-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
            More free resources
          </h2>
          <ul className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${swipeRow}`}>
            {MORE.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href} className={swipeItem}>
                  <Link
                    href={item.href}
                    className={`group flex h-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-[#c2a05a] ${focusRing}`}
                  >
                    <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77591B]" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#0A0A0A]">
                        {item.title}
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#A4823A]" />
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">{item.text}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <NextStep
          className="mt-12"
          placement="resources"
          steps={NEXT_STEPS.resourcesHub}
          heading="Done with the numbers? Keep going."
          intro="The guide that ties the tools together, the software they point to, and a free listing for your business."
        />

        <p
          role="note"
          className="mt-8 rounded-xl border border-stone-300/70 bg-stone-100/70 px-5 py-4 text-sm leading-relaxed text-stone-700"
        >
          <strong className="font-semibold text-stone-900">About the numbers. </strong>
          The figures on each card are that tool&apos;s own worked example, with sample inputs, not industry data.{" "}
          {CALCULATOR_DISCLAIMER}
        </p>
      </main>
    </ResourceChrome>
  );
}
