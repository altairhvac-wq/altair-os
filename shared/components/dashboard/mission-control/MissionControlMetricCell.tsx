import Link from "next/link";
import {
  altairMetricValueClass,
  type AltairColorHierarchyTone,
} from "@/shared/design-system/foundation";

type MissionControlMetricCellProps = {
  label: string;
  value: string;
  detail?: string;
  href: string;
  /** Semantic emphasis for the value only — labels stay muted graphite. */
  tone?: AltairColorHierarchyTone;
};

/**
 * Typography-led metric cell — no tile chrome. Used inside a single Surface 1
 * section so Today's Brief / Business Health read as one module, not a card grid.
 * Value carries hierarchy via weight/contrast; hue only when tone is status.
 */
export function MissionControlMetricCell({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: MissionControlMetricCellProps) {
  return (
    <Link
      href={href}
      className="group block min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 focus-visible:ring-offset-2"
    >
      <p className="text-[11px] font-medium leading-snug text-altair-ink-on-paper-muted sm:text-xs">
        {label}
      </p>
      <p
        className={`${altairMetricValueClass(tone)} group-hover:opacity-90`}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-altair-ink-on-paper-muted sm:text-xs">
          {detail}
        </p>
      ) : null}
    </Link>
  );
}
