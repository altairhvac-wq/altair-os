import Link from "next/link";
import type { RecommendationItem } from "./sample-data";

const priorityStyles = {
  high: "border-l-cyan-400 bg-slate-900/80 ring-cyan-500/20",
  medium: "border-l-sky-400 bg-slate-900/60 ring-slate-700/40",
  low: "border-l-slate-600 bg-slate-900/40 ring-slate-700/30",
} as const;

type RecommendationsBandProps = {
  recommendations: RecommendationItem[];
  momentum: string[];
};

export function RecommendationsBand({ recommendations, momentum }: RecommendationsBandProps) {
  return (
    <section
      aria-label="Recommendations and momentum"
      className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-4 ring-1 ring-slate-700/50 sm:p-5 lg:p-6"
    >
      <div className="relative grid gap-5 lg:grid-cols-[1fr_18rem] lg:gap-6">
        <div>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70">
            Next actions
          </p>
          <ul className="flex flex-col gap-2">
            {recommendations.map((rec, index) => (
              <li key={rec.id}>
                <Link
                  href={rec.href}
                  className={`flex items-start gap-3 rounded-xl border-l-[3px] px-4 py-3 ring-1 transition-colors hover:ring-cyan-500/30 ${priorityStyles[rec.priority]}`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
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

        <div className="rounded-xl bg-slate-950/50 p-4 ring-1 ring-slate-700/40">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/70">
            Momentum
          </p>
          <ul className="flex flex-col gap-2.5">
            {momentum.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="text-sm text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
