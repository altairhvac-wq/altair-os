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
    <div className="min-w-0 rounded-2xl border border-dashed border-slate-300 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
