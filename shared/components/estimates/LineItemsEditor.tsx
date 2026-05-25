import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/shared/types/customer";
import {
  calculateEstimateSubtotal,
  calculateLineItemTotal,
  type EstimateLineItemFormData,
} from "@/shared/types/estimate";

type LineItemsEditorProps = {
  lineItems: EstimateLineItemFormData[];
  onChange: (lineItems: EstimateLineItemFormData[]) => void;
};

const emptyLineItem: EstimateLineItemFormData = {
  description: "",
  quantity: 1,
  unitPrice: 0,
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1 block text-xs font-semibold text-slate-600";

export function LineItemsEditor({ lineItems, onChange }: LineItemsEditorProps) {
  const [items, setItems] = useState<EstimateLineItemFormData[]>(
    lineItems.length > 0 ? lineItems : [{ ...emptyLineItem }],
  );

  function updateItems(nextItems: EstimateLineItemFormData[]) {
    setItems(nextItems);
    onChange(nextItems);
  }

  function handleItemChange(
    index: number,
    field: keyof EstimateLineItemFormData,
    value: string,
  ) {
    const nextItems = items.map((item, i) => {
      if (i !== index) return item;

      if (field === "description") {
        return { ...item, description: value };
      }

      const numericValue = field === "quantity" ? parseInt(value, 10) : parseFloat(value);
      return {
        ...item,
        [field]: Number.isNaN(numericValue) ? 0 : numericValue,
      };
    });

    updateItems(nextItems);
  }

  function handleAddItem() {
    updateItems([...items, { ...emptyLineItem }]);
  }

  function handleRemoveItem(index: number) {
    if (items.length === 1) {
      updateItems([{ ...emptyLineItem }]);
      return;
    }

    updateItems(items.filter((_, i) => i !== index));
  }

  const subtotal = calculateEstimateSubtotal(items);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h3>
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const lineTotal = calculateLineItemTotal(item.quantity, item.unitPrice);

          return (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">
                  Item {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, "description", e.target.value)
                    }
                    placeholder="Service or part description"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Qty</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        handleItemChange(index, "unitPrice", e.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Total</label>
                    <div className="flex h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900">
                      {formatCurrency(lineTotal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Estimate total</span>
        <span className="text-base font-bold text-slate-900">
          {formatCurrency(subtotal)}
        </span>
      </div>
    </div>
  );
}
