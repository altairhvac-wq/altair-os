"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { listCustomerEquipmentAction } from "@/app/actions/customer-equipment";
import { CustomerEquipmentForm } from "@/shared/components/equipment/CustomerEquipmentForm";
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

export function CompleteJobEquipmentPanel({
  customerId,
  value,
  onChange,
}: CompleteJobEquipmentPanelProps) {
  const [expanded, setExpanded] = useState(value.mode !== "none");
  const [equipment, setEquipment] = useState<CustomerEquipment[]>([]);
  const [loading, setLoading] = useState(false);
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

    listCustomerEquipmentAction(customerId).then((result) => {
      if (cancelled) {
        return;
      }

      setEquipment(result.equipment ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [customerId, expanded]);

  function handleExpand() {
    const nextExpanded = !expanded;
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/70">
      <button
        type="button"
        onClick={handleExpand}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Settings2 className="h-4 w-4 text-violet-600" />
          Equipment
          <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-slate-200 px-3.5 py-3.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("create")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                value.mode === "create"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              Add new
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("update")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                value.mode === "update"
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
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
    </div>
  );
}

export const EMPTY_COMPLETE_JOB_EQUIPMENT_PAYLOAD: CompleteJobEquipmentPayload = {
  mode: "none",
};
