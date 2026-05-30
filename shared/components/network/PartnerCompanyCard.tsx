import { MapPin, ShieldCheck, Star, Wrench } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatRelationshipStatus,
  getPartnerInitials,
  type PartnerCompany,
} from "@/shared/types/network";

type PartnerCompanyCardProps = {
  partner: PartnerCompany;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
};

const statusStyles: Record<PartnerCompany["relationshipStatus"], string> = {
  preferred: "bg-amber-50 text-amber-800 ring-amber-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-blue-50 text-blue-700 ring-blue-600/20",
  paused: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function TrustScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
      <span className="text-xs font-bold text-white">{score}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        Trust
      </span>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-500">
      <Star className="h-3.5 w-3.5 fill-current" />
      <span className="text-sm font-bold text-slate-900">{rating.toFixed(1)}</span>
    </div>
  );
}

export function PartnerCompanyCard({
  partner,
  selected = false,
  onSelect,
  compact = false,
}: PartnerCompanyCardProps) {
  const interactive = Boolean(onSelect);

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={`rounded-xl border p-4 transition-all ${
        compact
          ? "border-slate-100 bg-white"
          : selected
            ? "border-cyan-300 bg-cyan-50/40 shadow-sm ring-1 ring-cyan-200"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      } ${interactive ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
            {getPartnerInitials(partner.companyName)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900">
              {partner.companyName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <Wrench className="h-3 w-3" />
                {partner.tradeType}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[partner.relationshipStatus]}`}
              >
                {formatRelationshipStatus(partner.relationshipStatus)}
              </span>
            </div>
          </div>
        </div>
        <TrustScore score={partner.trustScore} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate">{partner.serviceArea}</span>
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Jobs together
            </p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">
              {partner.jobsCompletedTogether}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Revenue
            </p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">
              {formatCurrency(partner.revenueGeneratedTogether)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Last worked
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {partner.lastWorkedDate
                ? formatDate(partner.lastWorkedDate)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Rating
            </p>
            <div className="mt-0.5">
              <RatingStars rating={partner.rating} />
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
