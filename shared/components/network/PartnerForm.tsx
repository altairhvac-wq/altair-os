"use client";

import {
  PARTNER_FORM_STATUS_OPTIONS,
  PARTNER_FORM_TRADE_OPTIONS,
  type PartnerFormData,
  type RelationshipStatus,
  type TradeType,
} from "@/shared/types/network";

type PartnerFormProps = {
  onSubmit: (data: PartnerFormData) => void;
  onCancel: () => void;
};

const emptyForm: PartnerFormData = {
  companyName: "",
  tradeType: "HVAC",
  contactName: "",
  phone: "",
  email: "",
  serviceArea: "",
  notes: "",
  relationshipStatus: "pending",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export function PartnerForm({ onSubmit, onCancel }: PartnerFormProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    onSubmit({
      companyName: String(form.get("companyName") ?? ""),
      tradeType: String(form.get("tradeType") ?? "HVAC") as TradeType,
      contactName: String(form.get("contactName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      serviceArea: String(form.get("serviceArea") ?? ""),
      notes: String(form.get("notes") ?? ""),
      relationshipStatus: String(
        form.get("relationshipStatus") ?? "pending",
      ) as RelationshipStatus,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="companyName" className={labelClass}>
            Company name
          </label>
          <input
            id="companyName"
            name="companyName"
            required
            defaultValue={emptyForm.companyName}
            placeholder="Summit Mechanical Co."
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="tradeType" className={labelClass}>
            Trade type
          </label>
          <select
            id="tradeType"
            name="tradeType"
            defaultValue={emptyForm.tradeType}
            className={inputClass}
          >
            {PARTNER_FORM_TRADE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="relationshipStatus" className={labelClass}>
            Relationship status
          </label>
          <select
            id="relationshipStatus"
            name="relationshipStatus"
            defaultValue={emptyForm.relationshipStatus}
            className={inputClass}
          >
            {PARTNER_FORM_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contactName" className={labelClass}>
            Contact name
          </label>
          <input
            id="contactName"
            name="contactName"
            required
            defaultValue={emptyForm.contactName}
            placeholder="Marcus Webb"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={emptyForm.phone}
            placeholder="(512) 555-0142"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={emptyForm.email}
            placeholder="contact@company.com"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="serviceArea" className={labelClass}>
            Service area
          </label>
          <input
            id="serviceArea"
            name="serviceArea"
            required
            defaultValue={emptyForm.serviceArea}
            placeholder="Austin Metro, TX"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={emptyForm.notes}
            placeholder="Preferred for overflow HVAC work, commercial only..."
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
        >
          Add partner
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
