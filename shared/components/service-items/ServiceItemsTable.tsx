"use client";

import { formatCurrency } from "@/shared/types/customer";
import type { ServiceItem } from "@/shared/types/service-item";

type ServiceItemsTableProps = {
  serviceItems: ServiceItem[];
  selectedItemId?: string;
  onSelectItem: (item: ServiceItem) => void;
};

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
} as const;

export function ServiceItemsTable({
  serviceItems,
  selectedItemId,
  onSelectItem,
}: ServiceItemsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Unit price</th>
            <th className="px-4 py-3">Taxable</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {serviceItems.map((item) => {
            const isSelected = item.id === selectedItemId;

            return (
              <tr
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                  isSelected ? "bg-cyan-50/60 hover:bg-cyan-50/80" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {item.name}
                    </p>
                    {item.description ? (
                      <p className="truncate text-xs text-slate-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {item.category ?? "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {item.taxable ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      item.isActive
                        ? statusStyles.active
                        : statusStyles.inactive
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
