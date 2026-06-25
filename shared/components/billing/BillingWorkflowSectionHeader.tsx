type BillingWorkflowSectionHeaderProps = {
  label: string;
  count: number;
  variant?: "mobile" | "table";
  colSpan?: number;
  northStar?: boolean;
};

export function BillingWorkflowSectionHeader({
  label,
  count,
  variant = "mobile",
  colSpan = 7,
  northStar = false,
}: BillingWorkflowSectionHeaderProps) {
  const badge = (
    <span
      className={
        northStar
          ? "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#EFE4CB] px-1.5 text-[10px] font-bold tabular-nums text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]"
          : "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-200/90 px-1.5 text-[10px] font-bold tabular-nums text-slate-600"
      }
    >
      {count}
    </span>
  );

  const titleRow = (
    <div className="flex items-center gap-2">
      <span
        className={
          northStar
            ? "text-[11px] font-semibold uppercase tracking-wide text-[#4F4638]"
            : "text-[11px] font-semibold uppercase tracking-wide text-slate-700"
        }
      >
        {label}
      </span>
      {badge}
    </div>
  );

  if (variant === "table") {
    return (
      <tr className={northStar ? "bg-[#EFE4CB]" : "bg-slate-50/80"}>
        <td colSpan={colSpan} className="admin-table-cell py-2.5">
          {titleRow}
        </td>
      </tr>
    );
  }

  return (
    <li className="list-none">
      <div
        className={
          northStar
            ? "sticky top-0 z-[1] border-b border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] px-3 py-2 backdrop-blur-sm"
            : "sticky top-0 z-[1] border-b border-slate-100/90 bg-slate-50/95 px-3 py-2 backdrop-blur-sm"
        }
      >
        {titleRow}
      </div>
    </li>
  );
}
