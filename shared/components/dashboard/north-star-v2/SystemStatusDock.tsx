type SystemStatusDockProps = {
  health: string;
  notifications: string;
};

export function SystemStatusDock({ health, notifications }: SystemStatusDockProps) {
  return (
    <footer
      aria-label="System status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100/60 px-4 py-2.5 ring-1 ring-slate-200/40"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-500/80"
          aria-hidden="true"
        />
        <span className="text-[11px] font-medium text-slate-500">{health}</span>
      </div>
      <span className="text-[11px] text-slate-400">{notifications}</span>
    </footer>
  );
}
