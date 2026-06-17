import { shellConceptMarkerClass } from "./shell-tokens";

export function ShellConceptBadge() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={shellConceptMarkerClass}>Internal</span>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
        Shell North Star · v1 · not production
      </span>
    </div>
  );
}
