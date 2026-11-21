import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, Calculator, LayoutGrid, MapPin, MonitorSmartphone, PlayCircle } from "lucide-react";
import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { NEXT_STEP_PREFIX } from "@/shared/lib/analytics/engagement";
import type { NextStepItem, NextStepKind } from "@/shared/lib/site/next-steps";

/**
 * The shared "Next step" module: two or three hand-chosen places to go from
 * here (a free tool, the guide that explains it, the software page for that
 * part of the job), and a soft line about the trial for those who are ready.
 *
 * ============ WHY ============
 * The 2026-11-20 site audit found 149 of 162 visits saw one page. Most pages
 * ended in a trial button and nothing else, so a visitor who was not ready
 * to try the software had nowhere to go. This gives them a next step that
 * fits the page they are on. Each page's steps are chosen by hand in
 * shared/lib/site/next-steps.ts.
 *
 * ============ MEASUREMENT ============
 * Each link carries `data-track="next-<kind>-<id>"`, which the first-party
 * EngagementTracker records as a `cta_click` (no database change); Platform
 * analytics names those rows "Next step". The trial link keeps the ordinary
 * trial-button event, named by `data-cta`.
 *
 * Server component: plain links, no client JavaScript.
 */

const KIND: Record<NextStepKind, { readonly label: string; readonly icon: LucideIcon; readonly cta: string }> = {
  tool: { label: "Free tool", icon: Calculator, cta: "Open the tool" },
  guide: { label: "Guide", icon: BookOpen, cta: "Read the guide" },
  software: { label: "The software", icon: MonitorSmartphone, cta: "See how it works" },
  video: { label: "Video", icon: PlayCircle, cta: "Watch it" },
  hub: { label: "Free tools", icon: LayoutGrid, cta: "Browse the tools" },
  directory: { label: "Directory", icon: MapPin, cta: "Open the directory" },
};

const TONES = {
  light: {
    panel: "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7",
    eyebrow: "text-[#77591B]",
    heading: "text-[#0A0A0A]",
    intro: "text-stone-600",
    card: "border-stone-200 bg-stone-50/60 hover:border-[#c2a05a] hover:bg-white",
    chip: "bg-stone-900 text-[#e8d9ac]",
    kind: "text-stone-500",
    title: "text-[#0A0A0A]",
    text: "text-stone-600",
    meta: "text-stone-500",
    cta: "text-[#77591B]",
    rule: "border-stone-200",
    trialText: "text-stone-600",
    trialLink: "text-[#77591B] hover:text-[#5b4413]",
    ring: "focus-visible:ring-offset-white",
  },
  dark: {
    panel:
      "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[linear-gradient(165deg,rgba(32,37,29,0.6)_0%,rgba(14,17,13,0.9)_100%)] p-5 sm:p-7",
    eyebrow: "text-[#c2a05a]",
    heading: "text-[#fff9ea]",
    intro: "text-[#c9bfae]",
    card: "border-[rgba(230,227,220,0.12)] bg-[rgba(8,9,7,0.45)] hover:border-[#c2a05a]/60",
    chip: "bg-[#a4823a]/15 text-[#e8d9ac] ring-1 ring-inset ring-[#c2a05a]/30",
    kind: "text-[#8e826f]",
    title: "text-[#fff9ea]",
    text: "text-[#c9bfae]",
    meta: "text-[#8e826f]",
    cta: "text-[#c2a05a]",
    rule: "border-[rgba(230,227,220,0.1)]",
    trialText: "text-[#c9bfae]",
    trialLink: "text-[#e8d9ac] hover:text-[#fff9ea]",
    ring: "focus-visible:ring-offset-[#080907]",
  },
} as const;

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

function trackLabel(item: NextStepItem): string {
  return `${NEXT_STEP_PREFIX}${item.kind}-${item.id}`.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 64);
}

export function NextStep({
  steps,
  placement,
  tone = "light",
  eyebrow = "Your next step",
  heading = "Where to go from here",
  intro,
  trial = true,
  headingLevel = 2,
  className = "",
}: {
  readonly steps: readonly NextStepItem[];
  /** Names this module's trial link in analytics (data-cta), e.g. "next-home". */
  readonly placement: string;
  readonly tone?: "light" | "dark";
  readonly eyebrow?: string;
  readonly heading?: string;
  readonly intro?: string;
  readonly trial?: boolean;
  readonly headingLevel?: 2 | 3;
  readonly className?: string;
}) {
  if (steps.length === 0) return null;
  const t = TONES[tone];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingId = `next-step-${placement}`;
  const columns = steps.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <section aria-labelledby={headingId} className={`${t.panel} ${className}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${t.eyebrow}`}>{eyebrow}</p>
      <Heading id={headingId} className={`mt-2 text-xl font-semibold tracking-tight sm:text-[1.4rem] ${t.heading}`}>
        {heading}
      </Heading>
      {intro ? <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${t.intro}`}>{intro}</p> : null}

      <ul className={`mt-5 grid gap-3 ${columns}`}>
        {steps.map((item) => {
          const kind = KIND[item.kind];
          const Icon = kind.icon;
          return (
            <li key={`${item.kind}-${item.href}`} className="min-w-0">
              <Link
                href={item.href}
                data-track={trackLabel(item)}
                className={`group flex h-full flex-col rounded-xl border p-4 transition-colors sm:p-5 ${t.card} ${focusRing} ${t.ring}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${t.kind}`}>{kind.label}</span>
                </span>
                <span className={`mt-3 block text-[15px] font-semibold leading-snug ${t.title}`}>{item.title}</span>
                <span className={`mt-1.5 block text-sm leading-relaxed ${t.text}`}>{item.text}</span>
                <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-4">
                  <span className={`inline-flex items-center gap-1 text-[13px] font-semibold ${t.cta}`}>
                    {item.cta ?? kind.cta}
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  {item.meta ? <span className={`text-xs ${t.meta}`}>{item.meta}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {trial ? (
        <p className={`mt-5 border-t pt-4 text-sm leading-relaxed ${t.rule} ${t.trialText}`}>
          Ready to run it on your own jobs? Altair Operating System is free for {SAAS_TRIAL_CONFIG.durationDays} days, no credit card.{" "}
          <Link
            href="/signup"
            data-cta={`next-${placement}`.slice(0, 64)}
            className={`whitespace-nowrap rounded-sm font-semibold underline-offset-4 hover:underline ${t.trialLink} ${focusRing} ${t.ring}`}
          >
            Start the free trial →
          </Link>
        </p>
      ) : null}
    </section>
  );
}
