import type { LucideIcon } from "lucide-react";

type SettingsFutureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function SettingsFutureCard({
  title,
  description,
  icon: Icon,
}: SettingsFutureCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-dashed border-slate-300 bg-white p-3.5 sm:p-4">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-slate-600 sm:text-sm">
            {description}
          </p>
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
