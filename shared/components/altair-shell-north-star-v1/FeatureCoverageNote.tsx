import type { FeatureCoverageEntry } from "./sample-data";

type FeatureCoverageNoteProps = {
  entries: FeatureCoverageEntry[];
};

export function FeatureCoverageNote({ entries }: FeatureCoverageNoteProps) {
  return (
    <details className="group rounded-xl bg-slate-950/50 ring-1 ring-slate-800/50">
      <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-500">Internal</span>
          Production dashboard feature coverage map
          <span className="text-slate-700 transition-transform group-open:rotate-90">›</span>
        </span>
      </summary>
      <div className="border-t border-slate-800/60 px-4 py-3">
        <p className="mb-3 text-xs text-slate-600">
          Maps where current production dashboard capabilities appear in this shell concept.
          Not visible to end users in production.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                <th className="pb-2 pr-4 font-semibold">Feature</th>
                <th className="pb-2 pr-4 font-semibold">Concept location</th>
                <th className="pb-2 font-semibold">Production section</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.feature} className="border-b border-slate-900/80 last:border-0">
                  <td className="py-2 pr-4 font-medium text-slate-400">{entry.feature}</td>
                  <td className="py-2 pr-4 text-slate-500">{entry.location}</td>
                  <td className="py-2 text-slate-600">{entry.productionSection ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
