import { Calendar, Mail, MapPin, Phone, Shield, X } from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatRelationshipStatus,
  type PartnerCompany,
  type PartnerFormData,
} from "@/shared/types/network";
import { PartnerCompanyCard } from "./PartnerCompanyCard";
import { PartnerForm } from "./PartnerForm";

type PanelMode = "detail" | "create" | "empty";

type PartnerDetailsPanelProps = {
  mode: PanelMode;
  partner: PartnerCompany | null;
  onClose: () => void;
  onCreateSubmit: (data: PartnerFormData) => void;
  onCreateCancel: () => void;
};

export function PartnerDetailsPanel({
  mode,
  partner,
  onClose,
  onCreateSubmit,
  onCreateCancel,
}: PartnerDetailsPanelProps) {
  const title =
    mode === "create"
      ? "Add partner"
      : mode === "detail" && partner
        ? partner.companyName
        : "Partner details";

  return (
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0`}
    >
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Save a company to your preferred partner network"
              : mode === "detail"
                ? "Preferred partner profile and relationship history"
                : "Select a partner from your network"}
          </p>
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 ring-1 ring-slate-200">
              <Shield className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No partner selected
            </p>
            <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-slate-500">
              Your preferred partner network is private. Select a company or add
              a new partner to get started.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <PartnerForm onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
        ) : null}

        {mode === "detail" && partner ? (
          <div className="space-y-6">
            <PartnerCompanyCard partner={partner} compact />

            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Contact
              </h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">
                  {partner.contactName}
                </p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{partner.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{partner.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {partner.city}, {partner.state}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500">Status</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatRelationshipStatus(partner.relationshipStatus)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500">Added</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatDate(partner.addedAt)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500">License</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {partner.licenseNumber ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500">Insured</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {partner.insured ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-900/10 bg-slate-900 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Shared revenue
              </p>
              <p className="mt-1 text-2xl font-black">
                {formatCurrency(partner.revenueGeneratedTogether)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Across {partner.jobsCompletedTogether} completed jobs
              </p>
            </div>

            {partner.notes ? (
              <div className="rounded-xl border border-slate-100 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Notes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {partner.notes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
