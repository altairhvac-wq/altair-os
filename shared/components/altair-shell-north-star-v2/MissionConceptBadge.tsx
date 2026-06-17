import { missionConceptMarkerClass } from "./mission-tokens";

export function MissionConceptBadge() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={missionConceptMarkerClass}>Internal</span>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
        Altair Mission Control · v2.1 · not production
      </span>
    </div>
  );
}
