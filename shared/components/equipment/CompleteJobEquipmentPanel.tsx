"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Wrench } from "lucide-react";
import { listCustomerEquipmentAction } from "@/app/actions/customer-equipment";
import { CustomerEquipmentForm } from "@/shared/components/equipment/CustomerEquipmentForm";
import {
  technicianFieldCloseoutInputClass,
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
} from "@/shared/components/technician/technician-field-styles";
import {
  EMPTY_CUSTOMER_EQUIPMENT_FORM,
  mapCustomerEquipmentToFormData,
  type CustomerEquipment,
  type CustomerEquipmentFormData,
} from "@/shared/types/customer-equipment";

export type CompleteJobEquipmentPayload = {
  mode: "none" | "create" | "update";
  equipmentId?: string;
  data?: CustomerEquipmentFormData;
};

type CompleteJobEquipmentPanelProps = {
  customerId: string;
  value: CompleteJobEquipmentPayload;
  onChange: (value: CompleteJobEquipmentPayload) => void;
};

const detailsClass = technicianFieldJobDetailsClass;
const summaryClass = `${technicianFieldJobDetailsSummaryClass} justify-between`;

export function CompleteJobEquipmentPanel({
  customerId,
  value,
  onChange,
}: CompleteJobEquipmentPanelProps) {
  const [expanded, setExpanded] = useState(value.mode !== "none");
  const [equipment, setEquipment] = useState<CustomerEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerEquipmentFormData>(
    EMPTY_CUSTOMER_EQUIPMENT_FORM,
  );
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");

  useEffect(() => {
    if (!expanded) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    listCustomerEquipmentAction(customerId).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.error) {
        setLoadError(result.error);
        setEquipment([]);
      } else {
        setEquipment(result.equipment ?? []);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [customerId, expanded]);

  function handleExpand(nextExpanded: boolean) {
    setExpanded(nextExpanded);

    if (!nextExpanded) {
      onChange({ mode: "none" });
      setSelectedEquipmentId("");
      setFormData(EMPTY_CUSTOMER_EQUIPMENT_FORM);
    }
  }

  function handleModeChange(mode: "create" | "update") {
    setSelectedEquipmentId("");
    setFormData(EMPTY_CUSTOMER_EQUIPMENT_FORM);

    if (mode === "create") {
      onChange({ mode: "create", data: EMPTY_CUSTOMER_EQUIPMENT_FORM });
      return;
    }

    onChange({ mode: "update" });
  }

  function handleEquipmentSelect(equipmentId: string) {
    setSelectedEquipmentId(equipmentId);
    const selected = equipment.find((item) => item.id === equipmentId);

    if (!selected) {
      onChange({ mode: "update" });
      return;
    }

    const nextFormData = mapCustomerEquipmentToFormData(selected);
    setFormData(nextFormData);
    onChange({
      mode: "update",
      equipmentId,
      data: nextFormData,
    });
  }

  function handleFormChange(nextFormData: CustomerEquipmentFormData) {
    setFormData(nextFormData);
    onChange({
      mode: value.mode === "update" ? "update" : "create",
      equipmentId: value.equipmentId,
      data: nextFormData,
    });
  }

  return (
    <details
      className={detailsClass}
      open={expanded}
      onToggle={(event) => {
        handleExpand((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className={summaryClass}>
        <span className="inline-flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          Equipment
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </summary>

      {expanded ? (
        <div className="space-y-4 px-3 pb-3 pt-1">
          {loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("create")}
              className={`min-h-11 touch-manipulation rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
                value.mode === "create"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-white/80 text-slate-700 hover:bg-white"
              }`}
            >
              Add new
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("update")}
              className={`min-h-11 touch-manipulation rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
                value.mode === "update"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-white/80 text-slate-700 hover:bg-white"
              }`}
            >
              Update existing
            </button>
          </div>

          {value.mode === "update" ? (
            <div>
              <label htmlFor="complete-job-equipment-select" className="mb-1 block text-xs font-semibold text-slate-600">
                Select equipment
              </label>
              <select
                id="complete-job-equipment-select"
                value={selectedEquipmentId}
                onChange={(event) => handleEquipmentSelect(event.target.value)}
                className={technicianFieldCloseoutInputClass}
              >
                <option value="">
                  {loading ? "Loading equipment..." : "Choose equipment to update"}
                </option>
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.serialNumber ? ` · S/N ${item.serialNumber}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {value.mode === "create" ||
          (value.mode === "update" && selectedEquipmentId) ? (
            <CustomerEquipmentForm
              formId="complete-job-equipment"
              data={formData}
              onChange={handleFormChange}
              compact
            />
          ) : null}
        </div>
      ) : null}
    </details>
  );
}

export const EMPTY_COMPLETE_JOB_EQUIPMENT_PAYLOAD: CompleteJobEquipmentPayload = {
  mode: "none",
};
