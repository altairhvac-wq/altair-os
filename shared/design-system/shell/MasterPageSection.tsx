import type { ReactNode } from "react";
import { masterShellSectionGap, type MasterShellDensity } from "./tokens";

export type MasterPageSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  density?: MasterShellDensity;
  id?: string;
  className?: string;
  /**
   * "hairline" (default) is the original bordered-header treatment used
   * across list/detail pages. "spacious" drops the divider in favor of
   * whitespace and stronger heading contrast — opt in per call site only;
   * it does not change the default so existing pages are unaffected.
   */
  headerVariant?: "hairline" | "spacious";
};

function hasVisibleChildren(children: ReactNode): boolean {
  if (children == null || children === false) {
    return false;
  }
  if (Array.isArray(children)) {
    return children.some(hasVisibleChildren);
  }
  return true;
}

export function MasterPageSection({
  title,
  description,
  children,
  density = "default",
  id,
  className = "",
  headerVariant = "hairline",
}: MasterPageSectionProps) {
  if (!hasVisibleChildren(children)) {
    return null;
  }

  const isSpacious = headerVariant === "spacious";

  return (
    <section
      id={id}
      className={`flex min-w-0 flex-col ${masterShellSectionGap[density]} ${className}`}
    >
      <header className={isSpacious ? "" : "border-b border-slate-200/80 pb-1.5"}>
        <h2
          className={
            isSpacious
              ? "text-sm font-bold tracking-tight text-slate-900 sm:text-base"
              : "text-xs font-bold uppercase tracking-wide text-slate-800 sm:text-sm"
          }
        >
          {title}
        </h2>
        {description ? (
          <p
            className={
              isSpacious
                ? "mt-0.5 text-xs leading-snug text-slate-600"
                : "mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs"
            }
          >
            {description}
          </p>
        ) : null}
      </header>
      <div className={`flex min-w-0 flex-col ${masterShellSectionGap[density]}`}>
        {children}
      </div>
    </section>
  );
}
