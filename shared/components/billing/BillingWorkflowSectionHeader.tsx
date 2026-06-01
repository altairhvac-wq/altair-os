import { formatBillingWorkflowSectionLabel } from "@/shared/lib/billing-workflow-list";

type BillingWorkflowSectionHeaderProps = {
  label: string;
  count: number;
  variant?: "mobile" | "table";
  colSpan?: number;
};

export function BillingWorkflowSectionHeader({
  label,
  count,
  variant = "mobile",
  colSpan = 7,
}: BillingWorkflowSectionHeaderProps) {
  const title = formatBillingWorkflowSectionLabel(label, count);

  if (variant === "table") {
    return (
      <tr className="bg-slate-50/90">
        <td
          colSpan={colSpan}
          className="admin-table-cell py-2 text-xs font-bold uppercase tracking-wide text-slate-600"
        >
          {title}
        </td>
      </tr>
    );
  }

  return (
    <li className="list-none">
      <div className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 px-3 py-2 backdrop-blur-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
          {title}
        </p>
      </div>
    </li>
  );
}
