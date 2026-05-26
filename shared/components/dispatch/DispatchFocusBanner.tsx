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
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-white to-white px-3 py-2 shadow-sm sm:gap-3 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 sm:h-9 sm:w-9 sm:rounded-xl">
          <Radio className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 sm:text-sm">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600 sm:mt-1 sm:text-xs sm:leading-relaxed">
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
