import type { ReactNode } from "react";
import { masterShellSectionGap, type MasterShellDensity } from "./tokens";

export type MasterPageSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  density?: MasterShellDensity;
  className?: string;
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
  className = "",
}: MasterPageSectionProps) {
  if (!hasVisibleChildren(children)) {
    return null;
  }

  return (
    <section
      className={`flex min-w-0 flex-col ${masterShellSectionGap[density]} ${className}`}
    >
      <header className="border-b border-slate-200/80 pb-1.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 sm:text-sm">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
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
