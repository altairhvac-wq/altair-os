import Link from "next/link";
import type { RecommendationItem } from "./sample-data";
import { shellEyebrowClass, shellInsetClass, shellZoneClass } from "./shell-tokens";

const priorityStyles = {
  high: "border-l-cyan-400 bg-slate-950/70 ring-cyan-500/15",
  medium: "border-l-indigo-400/70 bg-slate-950/50 ring-slate-800/40",
  low: "border-l-slate-700 bg-slate-950/35 ring-slate-800/30",
} as const;

type RecommendationsBandProps = {
  recommendations: RecommendationItem[];
  momentum: string[];
};

export function RecommendationsBand({ recommendations, momentum }: RecommendationsBandProps) {
  return (
    <section aria-label="Recommendations and momentum" className={shellZoneClass}>
      <div className="relative grid gap-5 lg:grid-cols-[1fr_16rem] lg:gap-6">
        <div>
          <p className={`mb-4 ${shellEyebrowClass}`}>What needs action now</p>
          <ul className="flex flex-col gap-2">
            {recommendations.map((rec, index) => (
              <li key={rec.id}>
                <Link
                  href={rec.href}
                  className={`flex items-start gap-3 rounded-xl border-l-[3px] px-4 py-3 ring-1 transition-colors hover:ring-cyan-500/25 ${priorityStyles[rec.priority]}`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-slate-500">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-100">{rec.title}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">{rec.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={shellInsetClass}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Momentum today
          </p>
          <ul className="flex flex-col gap-2.5">
            {momentum.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" aria-hidden="true" />
                <span className="text-sm text-slate-400">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
