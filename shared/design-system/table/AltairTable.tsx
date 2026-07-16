import type {
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

/**
 * Canonical Altair Table primitives.
 *
 * See shared/design-system/table/README.md for the full contract before
 * extending this file — in particular the row interaction contract and the
 * North Star / mobile boundaries. In short: these primitives own table
 * *structure* and *material* (valid table semantics, spacing, header/zebra/
 * hover/selected treatment). They never own data iteration, sorting,
 * pagination, routes, domain labels, or accessibility semantics that would
 * be incorrect for a table row — no `role="link"`, no `tabIndex`, no
 * keyboard routing. That stays with the domain component and the real Link
 * or button it renders inside a cell.
 */

export type AltairTableCellAlign = "left" | "right";

export type AltairTableProps = TableHTMLAttributes<HTMLTableElement>;

/** Valid `<table>` semantics, full-width layout, and the shared text/border baseline every ledger uses. */
export function AltairTable({
  className = "",
  children,
  ...rest
}: PropsWithChildren<AltairTableProps>) {
  return (
    <table
      className={`altair-table w-full border-collapse text-left text-sm ${className}`}
      {...rest}
    >
      {children}
    </table>
  );
}

export type AltairTableHeaderProps = HTMLAttributes<HTMLTableSectionElement>;

/** `<thead>` + the canonical header material (Paper Subtle background, quiet border). */
export function AltairTableHeader({
  className = "",
  children,
  ...rest
}: PropsWithChildren<AltairTableHeaderProps>) {
  return (
    <thead className={`altair-table-header ${className}`} {...rest}>
      {children}
    </thead>
  );
}

export type AltairTableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

/** Valid `<tbody>` only — see README for why this primitive owns nothing else. */
export function AltairTableBody({
  className,
  children,
  ...rest
}: PropsWithChildren<AltairTableBodyProps>) {
  return (
    <tbody className={className} {...rest}>
      {children}
    </tbody>
  );
}

export type AltairTableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  /** Visual selected state only. Never implies link/keyboard semantics — see the row interaction contract in the README. */
  selected?: boolean;
};

/**
 * Standard/selected row material plus optional pointer-only click
 * convenience. Deliberately does not add `tabIndex`, `role`, or keyboard
 * handling — a row is never a substitute for a real Link or button.
 */
export function AltairTableRow({
  selected = false,
  className = "",
  onClick,
  children,
  ...rest
}: PropsWithChildren<AltairTableRowProps>) {
  return (
    <tr
      onClick={onClick}
      className={[
        "altair-table-row",
        onClick ? "cursor-pointer" : "",
        selected ? "altair-table-row-selected" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </tr>
  );
}

export type AltairTableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: AltairTableCellAlign;
};

/**
 * Valid `<th>` with canonical spacing and header typography (small, bold,
 * uppercase, muted Ink-on-Paper). The typography lives in the zero-
 * specificity `.altair-table-head` rule in `app/globals.css`, not as
 * Tailwind utilities on this element, so a caller's own `className` (e.g. a
 * North Star token) reliably wins instead of racing it — see that CSS
 * block's comment for why.
 */
export function AltairTableHead({
  align = "left",
  className = "",
  children,
  ...rest
}: PropsWithChildren<AltairTableHeadProps>) {
  return (
    <th
      className={[
        "admin-table-cell altair-table-head",
        align === "right" ? "text-right" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </th>
  );
}

export type AltairTableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  align?: AltairTableCellAlign;
};

/** Valid `<td>` with canonical spacing. Carries no default text color — data-cell emphasis stays domain-owned. */
export function AltairTableCell({
  align = "left",
  className = "",
  children,
  ...rest
}: PropsWithChildren<AltairTableCellProps>) {
  return (
    <td
      className={[
        "admin-table-cell",
        align === "right" ? "text-right" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </td>
  );
}

export type AltairTablePrimaryCellProps = {
  /** The row's one real interactive control — a Link for a routed ledger, a button for an in-page panel. Never rendered by the primitive itself. */
  primary: ReactNode;
  /** Inline content next to the primary control (e.g. a lifecycle badge). */
  trailing?: ReactNode;
  /** Content before the primary/secondary stack (e.g. an avatar). Omit for ledgers with no avatar. */
  leading?: ReactNode;
  /** The muted line under the primary control (e.g. company, purchase date). */
  secondary?: ReactNode;
  className?: string;
};

/**
 * The primary/secondary vertical stack and truncation shell shared by every
 * ledger's first column. Does not decide Link vs. button, construct a
 * route, render a domain label, or manage click propagation — the caller's
 * `primary` element already owns that.
 */
export function AltairTablePrimaryCell({
  primary,
  trailing,
  leading,
  secondary,
  className,
}: AltairTablePrimaryCellProps) {
  const stack = (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {primary}
        {trailing}
      </div>
      {secondary}
    </div>
  );

  return (
    <AltairTableCell className={className}>
      {leading ? (
        <div className="flex items-center gap-3">
          {leading}
          {stack}
        </div>
      ) : (
        stack
      )}
    </AltairTableCell>
  );
}

export type AltairTableSecondaryTextProps = PropsWithChildren<
  HTMLAttributes<HTMLParagraphElement>
>;

/**
 * Semantic wrapper for the muted metadata line under a primary cell's main
 * control. Deliberately carries no default typography or color — legacy
 * and North Star ledgers currently use different text treatments for this
 * line (see the README, "Why SecondaryText has no default style"), and
 * baking one in here would visibly redesign a table this task is only
 * meant to restructure. It exists so that line has one name across ledgers;
 * a shared default can be added later once more ledgers actually converge
 * on one treatment.
 */
export function AltairTableSecondaryText({
  className,
  children,
  ...rest
}: AltairTableSecondaryTextProps) {
  return (
    <p className={className} {...rest}>
      {children}
    </p>
  );
}
