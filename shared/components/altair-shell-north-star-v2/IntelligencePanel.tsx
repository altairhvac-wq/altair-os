import Link from "next/link";
import { ArrowRight, BrainCircuit } from "lucide-react";
import type { MissionInsight } from "./sample-data";
import { missionGlassCardClass, missionEyebrowClass } from "./mission-tokens";

type IntelligencePanelProps = {
  insight: MissionInsight;
  momentum: string[];
};

export function IntelligencePanel({ insight, momentum }: IntelligencePanelProps) {
  return (
    <aside aria-label="Business intelligence" className={`${missionGlassCardClass} flex h-full flex-col`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl"
      />

      <div className="relative flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-violet-400" aria-hidden="true" />
          <p className={missionEyebrowClass}>Intelligence</p>
          {insight.confidence === "high" ? (
            <span className="ml-auto rounded-full bg-violet-950/60 px-2 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-violet-500/20">
              High confidence
            </span>
          ) : null}
        </div>

        <div>
          <h2 className="text-base font-semibold leading-snug text-white sm:text-lg">
            {insight.headline}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{insight.detail}</p>
        </div>

        <Link
          href={insight.href}
          className="group inline-flex items-center gap-2 self-start rounded-xl bg-violet-950/50 px-3.5 py-2 text-sm font-medium text-violet-200 ring-1 ring-violet-500/25 transition-all hover:bg-violet-900/50 hover:ring-violet-400/35"
        >
          {insight.action}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <div className="mt-auto border-t border-slate-800/60 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Today&apos;s momentum
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {momentum.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400/80" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
