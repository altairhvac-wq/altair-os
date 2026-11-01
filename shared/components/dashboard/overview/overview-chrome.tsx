import Link from "next/link";
import type { ReactNode } from "react";

/** Soft light card, the same shell the Mission Control exception cards use. */
export const OVERVIEW_CARD_CLASS =
  "min-w-0 overflow-hidden rounded-[var(--radius-panel)] border border-altair-border/40 bg-altair-paper shadow-[var(--elev-hairline),var(--elev-2)]";

export const OVERVIEW_LINK_CLASS =
  "shrink-0 text-xs font-semibold text-[var(--brand-metal-text)] underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:text-[0.8125rem]";

export function OverviewCardHeader({
  title,
  count,
  href,
  hrefLabel,
  trailing,
}: {
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
      <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-bold tracking-tight text-altair-ink-on-paper">
        <span className="truncate">{title}</span>
        {count != null ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-altair-paper-subtle px-2 py-0.5 text-[11px] font-bold tabular-nums leading-none text-altair-ink-on-paper-secondary ring-1 ring-inset ring-altair-border/50">
            {count}
          </span>
        ) : null}
      </h2>
      {trailing ??
        (href ? (
          <Link href={href} className={OVERVIEW_LINK_CLASS}>
            {hrefLabel ?? "View all"} →
          </Link>
        ) : null)}
    </div>
  );
}

export function OverviewAvatar({
  initials,
  dimmed = false,
  className = "",
}: {
  initials: string;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--chrome-elevated)] text-[10.5px] font-bold text-white ${
        dimmed ? "opacity-55" : ""
      } ${className}`}
    >
      {initials}
    </span>
  );
}
