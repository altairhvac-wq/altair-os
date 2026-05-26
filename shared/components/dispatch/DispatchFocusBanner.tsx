import Link from "next/link";
import { Radio, X } from "lucide-react";

type DispatchFocusBannerProps = {
  title: string;
  description: string;
  clearHref: string;
};

export function DispatchFocusBanner({
  title,
  description,
  clearHref,
}: DispatchFocusBannerProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-white to-white px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <Radio className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {description}
          </p>
        </div>
      </div>
      <Link
        href={clearHref}
        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-800 transition-colors hover:text-amber-950"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Clear view
      </Link>
    </div>
  );
}
