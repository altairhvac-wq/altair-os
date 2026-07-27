import {
  OPERATIONAL_EXPENSE_STATUS_STYLES,
  OPERATIONAL_STATUS_BADGE_BASE,
} from "@/shared/lib/operational-status-styles";
import { formatExpenseStatus, type ExpenseStatus } from "@/shared/types/expense";

type ExpenseStatusBadgeProps = {
  status: ExpenseStatus;
  className?: string;
  northStar?: boolean;
  /** Light text variants for badges sitting on the dark detail hero */
  onDarkSurface?: boolean;
};

/** North Star draft/submitted keep quiet paper/brass chrome; status uses semantic tokens. */
const northStarExpenseStatusStyles: Record<ExpenseStatus, string> = {
  draft: "bg-altair-paper-subtle text-altair-ink-secondary ring-altair-border",
  submitted:
    "bg-altair-brass/15 text-altair-ink-on-paper ring-altair-brass/25",
  approved:
    "bg-altair-success-surface text-altair-success-foreground ring-altair-success/15",
  rejected:
    "bg-altair-danger-surface text-altair-danger-foreground ring-altair-danger/15",
  reimbursed:
    "bg-altair-success-surface text-altair-success-foreground ring-altair-success/15",
};

const northStarDarkSurfaceStatusStyles: Record<ExpenseStatus, string> = {
  draft: "bg-altair-paper-subtle text-altair-ink-secondary ring-altair-border",
  submitted: "bg-altair-brass/25 text-altair-paper ring-altair-brass/35",
  approved:
    "bg-altair-success/20 text-altair-success-surface ring-altair-success/30",
  rejected: "bg-altair-danger/20 text-altair-danger-surface ring-altair-danger/30",
  reimbursed:
    "bg-altair-success/20 text-altair-success-surface ring-altair-success/30",
};

export function ExpenseStatusBadge({
  status,
  className = "",
  northStar = false,
  onDarkSurface = false,
}: ExpenseStatusBadgeProps) {
  const styles = northStar
    ? onDarkSurface
      ? northStarDarkSurfaceStatusStyles
      : northStarExpenseStatusStyles
    : OPERATIONAL_EXPENSE_STATUS_STYLES;

  return (
    <span
      className={`${OPERATIONAL_STATUS_BADGE_BASE} ${styles[status]} ${className}`}
    >
      {formatExpenseStatus(status)}
    </span>
  );
}
