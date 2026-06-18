"use client";

import { useState, useTransition } from "react";
import { Plus, Settings2, X } from "lucide-react";
import {
  createCustomerEquipmentAction,
  setCustomerEquipmentActiveAction,
  updateCustomerEquipmentAction,
} from "@/app/actions/customer-equipment";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { CustomerEquipmentForm } from "@/shared/components/equipment/CustomerEquipmentForm";
import {
  EMPTY_CUSTOMER_EQUIPMENT_FORM,
  formatEquipmentDate,
  formatWarrantyStatus,
  getWarrantyStatus,
  getWarrantyStatusStyles,
  mapCustomerEquipmentToFormData,
  validateCustomerEquipmentFormData,
  type CustomerEquipment,
  type CustomerEquipmentFormData,
} from "@/shared/types/customer-equipment";
import { CUSTOMER_DETAIL_EQUIPMENT_ANCHOR } from "@/shared/lib/customers/customer-detail-anchors";
import { adminCardSectionClass } from "@/shared/lib/admin-density";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type CustomerEquipmentSectionProps = {
  customerId: string;
  equipment: CustomerEquipment[];
  canManage: boolean;
  northStar?: boolean;
  compact?: boolean;
};

const COMPACT_EQUIPMENT_LIMIT = 4;

export function CustomerEquipmentSection({
  customerId,
  equipment: initialEquipment,
  canManage,
  northStar = false,
  compact = false,
}: CustomerEquipmentSectionProps) {
  const [equipment, setEquipment] = useState(initialEquipment);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] =
    useState<CustomerEquipment | null>(null);
  const [formData, setFormData] = useState<CustomerEquipmentFormData>(
    EMPTY_CUSTOMER_EQUIPMENT_FORM,
  );

  function openCreatePanel() {
    setEditingEquipment(null);
    setFormData(EMPTY_CUSTOMER_EQUIPMENT_FORM);
    setError(null);
    setPanelOpen(true);
  }

  function openEditPanel(item: CustomerEquipment) {
    setEditingEquipment(item);
    setFormData(mapCustomerEquipmentToFormData(item));
    setError(null);
    setPanelOpen(true);
  }

  function closePanel() {
    if (isPending) {
      return;
    }
    setPanelOpen(false);
    setEditingEquipment(null);
    setFormData(EMPTY_CUSTOMER_EQUIPMENT_FORM);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateCustomerEquipmentFormData(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = editingEquipment
        ? await updateCustomerEquipmentAction(editingEquipment.id, formData)
        : await createCustomerEquipmentAction(customerId, formData);

      if (result.error || !result.equipment) {
        setError(result.error ?? "Failed to save equipment.");
        return;
      }

      setEquipment((current) => {
        if (editingEquipment) {
          return current.map((item) =>
            item.id === result.equipment!.id ? result.equipment! : item,
          );
        }

        return [...current, result.equipment!].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

      closePanel();
    });
  }

  function handleDeactivate(item: CustomerEquipment) {
    setError(null);

    startTransition(async () => {
      const result = await setCustomerEquipmentActiveAction(item.id, false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setEquipment((current) => current.filter((entry) => entry.id !== item.id));
    });
  }

  const sectionClass = northStar
    ? compact
      ? dt.compactSectionSurface
      : dt.sectionSurface
    : adminCardSectionClass;
  const visibleEquipment = compact
    ? equipment.slice(0, COMPACT_EQUIPMENT_LIMIT)
    : equipment;
  const hiddenEquipmentCount = compact
    ? Math.max(0, equipment.length - COMPACT_EQUIPMENT_LIMIT)
    : 0;

  return (
    <section
      className={`${sectionClass} scroll-mt-6`}
      id={CUSTOMER_DETAIL_EQUIPMENT_ANCHOR}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={
              northStar
                ? dt.sectionIconWrap
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 ring-1 ring-violet-600/10"
            }
          >
            <Settings2
              className={northStar ? "h-4 w-4" : "h-4 w-4 text-violet-600"}
            />
          </div>
          <h2 className={northStar ? dt.sectionTitle : "text-sm font-bold text-slate-900"}>
            Equipment
          </h2>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={openCreatePanel}
            className={
              northStar
                ? dt.primaryAction
                : "inline-flex shrink-0 items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
            }
          >
            <Plus className="h-4 w-4" />
            Add equipment
          </button>
        ) : null}
      </div>

      {equipment.length === 0 ? (
        <div
          className={
            northStar
              ? `mt-3 ${dt.emptyState}`
              : "mt-6 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center"
          }
        >
          <p
            className={
              northStar
                ? "text-sm font-medium text-[#4F4638]"
                : "text-sm font-medium text-slate-700"
            }
          >
            No equipment on file
          </p>
          <p
            className={
              northStar
                ? "mt-1 text-xs text-[#6B6255]"
                : "mt-1 text-xs text-slate-500"
            }
          >
            Equipment added during jobs or from the office will appear here.
          </p>
        </div>
      ) : (
        <ul className={`${compact ? "mt-3" : "mt-6"} ${northStar ? dt.listDivider : "divide-y divide-slate-100"}`}>
          {visibleEquipment.map((item) => {
            const warrantyStatus = getWarrantyStatus(item.warrantyExpiresAt);

            return (
              <li key={item.id} className={`${compact ? "py-2.5" : "py-4"} first:pt-0 last:pb-0`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={northStar ? "font-semibold text-[#17130E]" : "font-semibold text-slate-900"}>
                        <DemoDisplayName>{item.name}</DemoDisplayName>
                      </p>
                      {item.equipmentType ? (
                        <span
                          className={
                            northStar
                              ? "rounded-full bg-[#EFE4CB] px-2 py-0.5 text-xs font-medium text-[#4F4638]"
                              : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          }
                        >
                          {item.equipmentType}
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getWarrantyStatusStyles(warrantyStatus)}`}
                      >
                        {formatWarrantyStatus(warrantyStatus)}
                      </span>
                    </div>

                    <div
                      className={
                        northStar
                          ? "mt-1.5 grid gap-0.5 text-sm text-[#4F4638] sm:grid-cols-2"
                          : "mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2"
                      }
                    >
                      {item.brand || item.modelNumber ? (
                        <p>
                          {[item.brand, item.modelNumber].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      {item.serialNumber ? (
                        <p className={northStar ? "text-[#6B6255]" : "text-slate-500"}>
                          S/N {item.serialNumber}
                        </p>
                      ) : null}
                      {item.location ? <p>{item.location}</p> : null}
                      {item.installDate ? (
                        <p className={northStar ? "text-[#6B6255]" : "text-slate-500"}>
                          Installed {formatEquipmentDate(item.installDate)}
                        </p>
                      ) : null}
                    </div>

                    {item.notes?.trim() && !compact ? (
                      <p className={northStar ? "mt-2 text-sm text-[#6B6255]" : "mt-2 text-sm text-slate-500"}>
                        {item.notes}
                      </p>
                    ) : null}
                  </div>

                  {canManage ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPanel(item)}
                        className={
                          northStar
                            ? dt.secondaryAction
                            : "rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(item)}
                        disabled={isPending}
                        className={
                          northStar
                            ? `${dt.secondaryAction} disabled:opacity-60`
                            : "rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-60"
                        }
                      >
                        Deactivate
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hiddenEquipmentCount > 0 ? (
        <p className={northStar ? dt.truncatedHint : "mt-2 text-xs text-slate-500"}>
          Showing {visibleEquipment.length} of {equipment.length} items
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {panelOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close equipment form"
            onClick={closePanel}
            disabled={isPending}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
            <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-3.5 overlay-header-safe-mobile sm:px-5 sm:py-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingEquipment ? "Edit equipment" : "Add equipment"}
                </h3>
                <p className="text-sm text-slate-500">
                  Track installed assets and warranty details.
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                disabled={isPending}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="overflow-y-auto px-4 py-4 sm:px-5">
                <CustomerEquipmentForm
                  formId="customer-equipment-panel"
                  data={formData}
                  onChange={setFormData}
                  showActiveToggle={Boolean(editingEquipment)}
                />
                {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
              </div>

              <footer className="flex shrink-0 gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Saving..." : editingEquipment ? "Save changes" : "Add equipment"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
