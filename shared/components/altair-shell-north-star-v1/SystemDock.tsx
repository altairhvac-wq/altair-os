import { shellStatusDockClass } from "./shell-tokens";

type SystemDockProps = {
  health: string;
  notifications: string;
};

export function SystemDock({ health, notifications }: SystemDockProps) {
  return (
    <footer aria-label="System status" className={shellStatusDockClass}>
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-emerald-400/90" aria-hidden="true" />
        <span className="text-[11px] font-medium text-slate-400">{health}</span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-600">
        <span>{notifications}</span>
        <span className="hidden sm:inline">Shell North Star · concept only</span>
      </div>
    </footer>
  );
}
