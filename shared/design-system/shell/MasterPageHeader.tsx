import type { ReactNode } from "react";
import type { MasterShellDensity } from "./tokens";

export type MasterPageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Optional center slot between title block and actions (e.g. compact metrics). */
  center?: ReactNode;
  /** Slimmer title bar for dense list pages */
  density?: MasterShellDensity;
  /** Use North Star page header surface instead of legacy admin-page-header */
  surfaceVariant?: "default" | "northStar";
  titleClassName?: string;
  subtitleClassName?: string;
  eyebrowClassName?: string;
  className?: string;
};

export function MasterPageHeader({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryAction,
  center,
  density = "default",
  surfaceVariant = "default",
  titleClassName = "",
  subtitleClassName = "",
  eyebrowClassName = "",
  className = "",
}: MasterPageHeaderProps) {
  const isCompact = density === "compact";
  const hasActions = Boolean(primaryAction || secondaryAction);
  const hasMobileContent = Boolean(subtitle || eyebrow || hasActions);
  const responsiveTitleClass = "sr-only md:not-sr-only";
  const actionRowClass = isCompact
    ? "flex shrink-0 items-center gap-2"
    : "flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center";

  const surfaceClass =
    surfaceVariant === "northStar" ? "north-star-page-header" : "admin-page-header";

  const layoutClass =
    surfaceVariant === "northStar"
      ? isCompact
        ? center
          ? "items-center gap-3"
          : "items-start sm:items-center"
        : "flex-wrap items-start gap-3"
      : isCompact
        ? center
          ? /* `lg:flex-wrap` — wrapping is allowed only from the breakpoint
             * where the centre slot actually renders. From `lg` up, title +
             * centre + non-shrinking actions can genuinely exceed the row
             * (966px of content in 766px on the Customers hub at 1024), and
             * without a wrap the shortfall lands on the tab strip, whose
             * labels break over two lines and clip. Below `lg` there is no
             * centre slot and the row fits, so wrapping there would only add
             * height for nothing. */
            "items-center gap-3 px-3 py-2 sm:px-3.5 lg:flex-wrap"
          : "items-start px-3 py-2 sm:items-center sm:px-3.5"
        : "flex-wrap items-start gap-3";

  return (
    <header
      className={`${surfaceClass} ${hasMobileContent ? "flex" : "hidden md:flex"} shrink-0 gap-2 ${center ? "" : "justify-between"} ${layoutClass} ${className}`}
    >
      {/* `flex-auto` (`flex: 1 1 auto`), not `flex-1` (`flex: 1 1 0%`). With a
          zero basis this block made no claim on width at all, so it collapsed
          while the centre slot and the shrink-0 actions kept theirs. It also
          had to be wide enough to contain the non-shrinking title below —
          otherwise the title overflowed the block and printed on top of the
          neighbouring slot, which is what /work did at every desktop width.
          `min-w-0` stays so the subtitle can still truncate. */}
      <div className={`min-w-0 flex-auto ${isCompact ? "space-y-0.5" : ""}`}>
        {eyebrow ? (
          <p className={eyebrowClassName || "admin-heading-eyebrow"}>{eyebrow}</p>
        ) : null}
        {isCompact ? (
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            {/*
              `sm:shrink-0` is applied to every title, not just the default one.
              It used to live inside the fallback string, so any page passing a
              custom `titleClassName` silently lost it — the Customers hub among
              them — and the title then competed with its own subtitle for room
              and truncated first. A page title yielding before its subtitle is
              never the right outcome, so the rule belongs to the component.
            */}
            <h1
              className={`sm:shrink-0 ${
                titleClassName ||
                "min-w-0 text-base font-bold tracking-tight text-slate-900 sm:text-lg"
              } ${responsiveTitleClass}`}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={
                  subtitleClassName ||
                  "min-w-0 text-xs leading-snug text-slate-500 sm:truncate"
                }
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <h1 className={`admin-heading-page ${responsiveTitleClass}`}>{title}</h1>
            {subtitle ? (
              <p className="admin-text-helper mt-1 max-w-2xl">{subtitle}</p>
            ) : null}
          </>
        )}
      </div>
      {/* min-w-0 + shrink lets the slot compress; the strip inside it carries
          its own overflow-x, so compressed content stays reachable rather than
          being lost under the action buttons — e.g. the Sales hub tabs
          truncating "Estimate Pipeline" at laptop widths. */}
      {center ? (
        <div className="hidden min-w-0 shrink lg:block">{center}</div>
      ) : null}
      {hasActions ? (
        <div className={`${actionRowClass} ${center ? "ml-auto" : ""}`}>
          {secondaryAction}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}
