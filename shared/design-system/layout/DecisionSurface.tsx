import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import {
  altairSurfaceCardClass,
  altairSurfaceSectionClass,
  altairSurfaceTileClass,
} from "@/shared/design-system/shell/surface-hierarchy";
import type { CardSize } from "./card-size";

export type DecisionSurfaceVariant = "bare" | "card" | "section" | "tile";
export type DecisionSurfaceHeadingLevel = "h2" | "h3" | "h4";

export type DecisionSurfaceClassNames = {
  header?: string;
  icon?: string;
  content?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  status?: string;
  body?: string;
  actions?: string;
  progress?: string;
  footer?: string;
};

export type DecisionSurfaceProps = Omit<
  ComponentPropsWithoutRef<"article">,
  "children" | "title"
> & {
  title?: ReactNode;
  eyebrow?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  progress?: ReactNode;
  status?: ReactNode;
  children?: ReactNode;
  size?: CardSize;
  variant?: DecisionSurfaceVariant;
  headingLevel?: DecisionSurfaceHeadingLevel;
  titleId?: string;
  classNames?: DecisionSurfaceClassNames;
};

const variantClass: Record<DecisionSurfaceVariant, string> = {
  bare: "",
  card: `${altairSurfaceCardClass} p-4`,
  section: `${altairSurfaceSectionClass} p-4`,
  tile: altairSurfaceTileClass,
};

/**
 * Generic compact informational composition. It owns slot structure and
 * semantics, but never business language, actions, progress behavior, status
 * logic, or width. Use `variant="bare"` when migrating an established surface
 * whose existing material treatment must remain unchanged.
 */
export function DecisionSurface({
  title,
  eyebrow,
  icon,
  description,
  actions,
  footer,
  progress,
  status,
  children,
  size = "m",
  variant = "card",
  headingLevel = "h3",
  titleId,
  className = "",
  classNames = {},
  ...rest
}: DecisionSurfaceProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;
  const Heading = headingLevel;
  const hasHeader = Boolean(icon || eyebrow || title || description || status);

  return (
    <article
      {...rest}
      aria-labelledby={title ? resolvedTitleId : rest["aria-labelledby"]}
      className={`min-w-0 ${variantClass[variant]} ${className}`}
      data-card-size={size}
    >
      {hasHeader ? (
        <div
          className={`flex min-w-0 items-start justify-between gap-3 ${classNames.header ?? ""}`}
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon ? (
              <div
                className={`shrink-0 ${classNames.icon ?? ""}`}
                aria-hidden="true"
              >
                {icon}
              </div>
            ) : null}
            <div className={`min-w-0 flex-1 ${classNames.content ?? ""}`}>
              {eyebrow ? (
                <p
                  className={
                    classNames.eyebrow ??
                    "text-[10px] font-bold uppercase tracking-[0.14em]"
                  }
                >
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <Heading
                  id={resolvedTitleId}
                  className={
                    classNames.title ?? "text-base font-bold tracking-tight"
                  }
                >
                  {title}
                </Heading>
              ) : null}
              {description ? (
                <div
                  className={
                    classNames.description ?? "text-sm leading-relaxed"
                  }
                >
                  {description}
                </div>
              ) : null}
            </div>
          </div>
          {status ? (
            <div className={`shrink-0 ${classNames.status ?? ""}`}>{status}</div>
          ) : null}
        </div>
      ) : null}

      {children ? (
        <div className={`min-w-0 ${classNames.body ?? ""}`}>{children}</div>
      ) : null}
      {actions ? (
        <div className={`min-w-0 ${classNames.actions ?? ""}`}>{actions}</div>
      ) : null}
      {progress ? (
        <div className={`min-w-0 ${classNames.progress ?? ""}`}>{progress}</div>
      ) : null}
      {footer ? (
        <footer className={`min-w-0 ${classNames.footer ?? ""}`}>{footer}</footer>
      ) : null}
    </article>
  );
}
