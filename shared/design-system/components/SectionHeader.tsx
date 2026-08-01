import Link from "next/link";
import {
  altairCanvasInkClass,
  altairCanvasInkLinkClass,
  altairSectionTitleAccentClass,
} from "@/shared/design-system/foundation";

export type SectionHeaderAction = {
  label: string;
  href?: string;
};

export type SectionHeaderProps = {
  title: string;
  action?: SectionHeaderAction;
  className?: string;
};

/**
 * Mission Control section title — brass accent rail + title + optional action.
 * Use above MC surface cards (stat grids, lists, callouts), not as a page header.
 */
export function SectionHeader({
  title,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <header className={`flex items-start gap-2.5 ${className}`.trim()}>
      <span aria-hidden="true" className={altairSectionTitleAccentClass} />
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
        <h2
          className={`text-sm font-bold tracking-tight sm:text-base ${altairCanvasInkClass}`}
        >
          {title}
        </h2>
        {action ? (
          action.href ? (
            <Link
              href={action.href}
              className={`shrink-0 text-xs font-medium underline-offset-2 transition hover:underline sm:text-[0.8125rem] ${altairCanvasInkLinkClass}`}
            >
              {action.label}
            </Link>
          ) : (
            <span
              className={`shrink-0 text-xs font-medium sm:text-[0.8125rem] ${altairCanvasInkLinkClass}`}
            >
              {action.label}
            </span>
          )
        ) : null}
      </div>
    </header>
  );
}
