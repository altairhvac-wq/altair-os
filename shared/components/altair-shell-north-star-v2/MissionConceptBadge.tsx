import { missionConceptMarkerClass } from "./mission-tokens";

export function MissionConceptBadge() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={missionConceptMarkerClass}>Internal</span>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        Altair Mission Control · v2.2 · dark shell · light workspace · not production
      </span>
    </div>
  );
}
