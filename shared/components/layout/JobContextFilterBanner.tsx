import Link from "next/link";
import { Briefcase, X } from "lucide-react";

type JobContextFilterBannerProps = {
  jobLabel: string;
  clearHref: string;
  variant?: "filter" | "create";
};

export function JobContextFilterBanner({
  jobLabel,
  clearHref,
  variant = "filter",
}: JobContextFilterBannerProps) {
  const prefix =
    variant === "create" ? "Creating invoice for" : "Showing records for";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-200/80 bg-cyan-50/60 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-cyan-950">
        <Briefcase
          className="h-4 w-4 shrink-0 text-cyan-700"
          aria-hidden="true"
        />
        <span>
          {prefix}{" "}
          <span className="font-semibold">Job {jobLabel}</span>
        </span>
      </div>
      <Link
        href={clearHref}
        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 transition-colors hover:text-cyan-900"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        Clear filter
      </Link>
    </div>
  );
}
