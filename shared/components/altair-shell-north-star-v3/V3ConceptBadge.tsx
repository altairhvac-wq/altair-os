import { v3ConceptMarkerClass } from "./v3-tokens";

export function V3ConceptBadge() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={v3ConceptMarkerClass}>Internal</span>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(41,34,24,0.48)]">
        Altair Shell North Star · v3.1 · not production
      </span>
    </div>
  );
}
