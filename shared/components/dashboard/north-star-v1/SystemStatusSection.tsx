type SystemStatusSectionProps = {
  health: string;
  notifications: string;
};

export function SystemStatusSection({ health, notifications }: SystemStatusSectionProps) {
  return (
    <footer className="flex flex-col gap-2 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-400">{health}</p>
      <p className="text-xs text-slate-400">{notifications}</p>
    </footer>
  );
}
