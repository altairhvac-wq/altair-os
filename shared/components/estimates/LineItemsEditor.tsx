"use client";

import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/shared/types/customer";
import {
  calculateEstimateTotals,
  calculateLineItemTotal,
  type EstimateLineItemFormData,
} from "@/shared/types/estimate";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  adminFormInputClass,
  adminFormLabelClass,
  adminLineItemGridClass,
  adminLineItemShellClass,
} from "@/shared/lib/admin-density";

const CUSTOM_SERVICE_ITEM_ID = "";

type LineItemsEditorProps = {
  lineItems: EstimateLineItemFormData[];
  serviceItems: ServiceItem[];
  taxRate: number;
  onChange: (lineItems: EstimateLineItemFormData[]) => void;
};

const emptyLineItem: EstimateLineItemFormData = {
  name: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
  taxable: true,
};

function getLineItemLabel(item: EstimateLineItemFormData, index: number): string {
  const name = item.name.trim();
  if (name) return name;

  const description = item.description.trim();
  if (description) return description;

  return `Line item ${index + 1}`;
}

export function LineItemsEditor({
  lineItems,
  serviceItems,
  taxRate,
  onChange,
}: LineItemsEditorProps) {
  const items = lineItems.length > 0 ? lineItems : [{ ...emptyLineItem }];
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (scrollToIndex == null) return;

    const node = itemRefs.current.get(scrollToIndex);
    if (!node) return;

    node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setScrollToIndex(null);
  }, [scrollToIndex, items.length, expandedIndex]);

  function updateItems(nextItems: EstimateLineItemFormData[]) {
    onChange(nextItems);
  }

  function handleServiceItemChange(index: number, serviceItemId: string) {
    const nextItems = items.map((item, i) => {
      if (i !== index) return item;

      if (!serviceItemId) {
        return {
          ...item,
          serviceItemId: undefined,
        };
      }

      const serviceItem = serviceItems.find(
        (candidate) => candidate.id === serviceItemId,
      );

      if (!serviceItem) {
        return item;
      }

      return {
        ...item,
        serviceItemId: serviceItem.id,
        name: serviceItem.name,
        description: serviceItem.description ?? "",
        unitPrice: serviceItem.unitPrice,
        taxable: serviceItem.taxable,
      };
    });

    updateItems(nextItems);
  }

  function handleItemChange(
    index: number,
    field: keyof EstimateLineItemFormData,
    value: string | boolean,
  ) {
    const nextItems = items.map((item, i) => {
      if (i !== index) return item;

      if (field === "name" || field === "description") {
        return { ...item, [field]: String(value) };
      }

      if (field === "taxable") {
        return { ...item, taxable: Boolean(value) };
      }

      const numericValue =
        field === "quantity" ? parseInt(String(value), 10) : parseFloat(String(value));
      return {
        ...item,
        [field]: Number.isNaN(numericValue) ? 0 : numericValue,
      };
    });

    updateItems(nextItems);
  }

  function handleAddItem() {
    const newIndex = items.length;
    updateItems([...items, { ...emptyLineItem }]);
    setExpandedIndex(newIndex);
    setScrollToIndex(newIndex);
  }

  function handleRemoveItem(index: number) {
    if (items.length === 1) {
      updateItems([{ ...emptyLineItem }]);
      setExpandedIndex(0);
      return;
    }

    updateItems(items.filter((_, i) => i !== index));

    setExpandedIndex((current) => {
      if (current === index) {
        return Math.max(0, index - 1);
      }
      if (current > index) {
        return current - 1;
      }
      return current;
    });
  }

  function handleExpand(index: number) {
    setExpandedIndex(index);
  }

  const totals = calculateEstimateTotals(items, taxRate);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h3>
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex min-h-11 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add line item
        </button>
      </div>

      <div className="space-y-1.5">
        {items.map((item, index) => {
          const lineTotal = calculateLineItemTotal(item.quantity, item.unitPrice);
          const selectedServiceId = item.serviceItemId ?? CUSTOM_SERVICE_ITEM_ID;
          const isCustomLineItem = selectedServiceId === CUSTOM_SERVICE_ITEM_ID;
          const isExpanded = expandedIndex === index;
          const label = getLineItemLabel(item, index);

          return (
            <div
              key={index}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(index, node);
                } else {
                  itemRefs.current.delete(index);
                }
              }}
              className={adminLineItemShellClass}
            >
              {isExpanded ? (
                <>
                  <div className="mb-1.5 flex items-end gap-1.5">
                    <div className="min-w-0 flex-1">
                      <label className={adminFormLabelClass}>Price book</label>
                      <select
                        value={selectedServiceId}
                        onChange={(e) =>
                          handleServiceItemChange(index, e.target.value)
                        }
                        className={adminFormInputClass}
                        title={
                          serviceItems.length === 0
                            ? "Add items in Price Book first"
                            : undefined
                        }
                      >
                        <option value={CUSTOM_SERVICE_ITEM_ID}>Custom</option>
                        {serviceItems.map((serviceItem) => (
                          <option key={serviceItem.id} value={serviceItem.id}>
                            {serviceItem.name} · {formatCurrency(serviceItem.unitPrice)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="mb-0.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-red-600"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className={`${adminLineItemGridClass} sm:items-end`}>
                    {isCustomLineItem ? (
                      <div className="sm:col-span-6">
                        <label className={adminFormLabelClass}>Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(index, "name", e.target.value)
                          }
                          placeholder="Line name"
                          autoComplete="off"
                          className={adminFormInputClass}
                          required
                        />
                      </div>
                    ) : null}
                    <div className={isCustomLineItem ? "sm:col-span-6" : "sm:col-span-12"}>
                      <label className={adminFormLabelClass}>Desc</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        placeholder="Optional"
                        className={adminFormInputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={adminFormLabelClass}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        className={adminFormInputClass}
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className={adminFormLabelClass}>Unit $</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          handleItemChange(index, "unitPrice", e.target.value)
                        }
                        className={adminFormInputClass}
                        required
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className={adminFormLabelClass}>Total</label>
                      <div className="flex min-h-11 items-center rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-900">
                        {formatCurrency(lineTotal)}
                      </div>
                    </div>
                    <div className="flex min-h-11 items-center sm:col-span-4">
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.taxable}
                          onChange={(e) =>
                            handleItemChange(index, "taxable", e.target.checked)
                          }
                          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/20"
                        />
                        Tax
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExpand(index)}
                  className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-white/80"
                  aria-expanded={false}
                  aria-label={`Edit ${label}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(lineTotal)}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1 rounded-md border border-slate-200 bg-white px-2.5 py-2">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {taxRate > 0 ? (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Tax ({taxRate}%)</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-sm font-bold text-slate-900">
          <span>Total</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}
