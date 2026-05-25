"use client";

import type { CustomerEquipmentFormData } from "@/shared/types/customer-equipment";

type CustomerEquipmentFormProps = {
  formId: string;
  data: CustomerEquipmentFormData;
  onChange: (data: CustomerEquipmentFormData) => void;
  showActiveToggle?: boolean;
  compact?: boolean;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1 block text-xs font-semibold text-slate-600";

export function CustomerEquipmentForm({
  formId,
  data,
  onChange,
  showActiveToggle = false,
  compact = false,
}: CustomerEquipmentFormProps) {
  function updateField<K extends keyof CustomerEquipmentFormData>(
    field: K,
    value: CustomerEquipmentFormData[K],
  ) {
    onChange({ ...data, [field]: value });
  }

  const gridClass = compact
    ? "grid gap-3 sm:grid-cols-2"
    : "grid gap-4 sm:grid-cols-2";

  return (
    <div id={formId} className={gridClass}>
      <div className={compact ? "sm:col-span-2" : "sm:col-span-2"}>
        <label htmlFor={`${formId}-name`} className={labelClass}>
          Equipment name
        </label>
        <input
          id={`${formId}-name`}
          type="text"
          required
          value={data.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="e.g. Main AC unit"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-type`} className={labelClass}>
          Type
        </label>
        <input
          id={`${formId}-type`}
          type="text"
          value={data.equipmentType}
          onChange={(event) => updateField("equipmentType", event.target.value)}
          placeholder="HVAC, water heater..."
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-brand`} className={labelClass}>
          Brand
        </label>
        <input
          id={`${formId}-brand`}
          type="text"
          value={data.brand}
          onChange={(event) => updateField("brand", event.target.value)}
          placeholder="Manufacturer"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-model`} className={labelClass}>
          Model number
        </label>
        <input
          id={`${formId}-model`}
          type="text"
          value={data.modelNumber}
          onChange={(event) => updateField("modelNumber", event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-serial`} className={labelClass}>
          Serial number
        </label>
        <input
          id={`${formId}-serial`}
          type="text"
          value={data.serialNumber}
          onChange={(event) => updateField("serialNumber", event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-install-date`} className={labelClass}>
          Install date
        </label>
        <input
          id={`${formId}-install-date`}
          type="date"
          value={data.installDate}
          onChange={(event) => updateField("installDate", event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-warranty`} className={labelClass}>
          Warranty expires
        </label>
        <input
          id={`${formId}-warranty`}
          type="date"
          value={data.warrantyExpiresAt}
          onChange={(event) =>
            updateField("warrantyExpiresAt", event.target.value)
          }
          className={inputClass}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${formId}-location`} className={labelClass}>
          Location at property
        </label>
        <input
          id={`${formId}-location`}
          type="text"
          value={data.location}
          onChange={(event) => updateField("location", event.target.value)}
          placeholder="Attic, basement, garage..."
          className={inputClass}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${formId}-notes`} className={labelClass}>
          Notes
        </label>
        <textarea
          id={`${formId}-notes`}
          rows={compact ? 2 : 3}
          value={data.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Additional details..."
          className={inputClass}
        />
      </div>

      {showActiveToggle ? (
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={data.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500/20"
            />
            Active equipment
          </label>
        </div>
      ) : null}
    </div>
  );
}
