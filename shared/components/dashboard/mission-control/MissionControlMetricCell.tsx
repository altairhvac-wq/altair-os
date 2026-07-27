import Link from "next/link";

type MissionControlMetricCellProps = {
  label: string;
  value: string;
  detail?: string;
  href: string;
};

/**
 * Typography-led metric cell — no tile chrome. Used inside a single Surface 1
 * section so Today's Brief / Business Health read as one module, not a card grid.
 */
export function MissionControlMetricCell({
  label,
  value,
  detail,
  href,
}: MissionControlMetricCellProps) {
  return (
    <Link
      href={href}
      className="group block min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2"
    >
      <p className="text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black leading-none tracking-tight tabular-nums text-slate-900 transition-colors group-hover:text-slate-700 sm:text-[1.75rem]">
        {value}
      </p>
      {detail ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-500 sm:text-xs">
          {detail}
        </p>
      ) : null}
    </Link>
  );
}
