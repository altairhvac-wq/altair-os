import type { LeadStage } from "./sample-data";
import { shellEyebrowClass, shellZoneClass } from "./shell-tokens";

type GrowthPipelinePanelProps = {
  stages: LeadStage[];
};

export function GrowthPipelinePanel({ stages }: GrowthPipelinePanelProps) {
  const totalValue = stages.reduce((sum, stage) => {
    const numeric = parseFloat(stage.value.replace(/[$,k]/g, "")) * (stage.value.includes("k") ? 1000 : 1);
    return sum + numeric;
  }, 0);

  const formattedTotal =
    totalValue >= 1000 ? `$${(totalValue / 1000).toFixed(1)}k` : `$${totalValue.toFixed(0)}`;

  return (
    <section aria-label="Growth pipeline" className={shellZoneClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_100%_0%,rgba(99,102,241,0.08),transparent_55%)]"
      />

      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`${shellEyebrowClass} text-indigo-400/60`}>Growth pipeline</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-slate-100">
            New work entering the business
          </p>
        </div>
        <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700/40">
          {formattedTotal} in pipeline
        </span>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-cyan-500/20 via-indigo-500/15 to-transparent sm:block"
        />

        <ol className="relative grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {stages.map((stage, index) => (
            <li key={stage.id} className="relative flex flex-col gap-3">
              <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-200 ring-2 ring-slate-700/60">
                  {stage.count}
                </div>
                {index < stages.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className="hidden h-px flex-1 bg-gradient-to-r from-slate-700/60 to-transparent sm:block lg:absolute lg:left-8 lg:right-0 lg:top-4 lg:w-auto"
                  />
                ) : null}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {stage.label}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-100">{stage.value}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400/70 to-indigo-400/60"
                    style={{ width: `${stage.fill}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
