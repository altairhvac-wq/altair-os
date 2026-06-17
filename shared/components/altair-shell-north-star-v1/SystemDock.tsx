type SystemDockProps = {
  health: string;
  notifications: string;
};

export function SystemDock({ health, notifications }: SystemDockProps) {
  return (
    <footer
      aria-label="System status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 ring-1 ring-slate-700/50"
    >
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
        <span className="text-[11px] font-medium text-slate-300">{health}</span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span>{notifications}</span>
        <span className="hidden sm:inline">Shell North Star · concept only</span>
      </div>
    </footer>
  );
}
