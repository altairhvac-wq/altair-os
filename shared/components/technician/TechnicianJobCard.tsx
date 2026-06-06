"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type { JobStatus } from "@/shared/types/job";
import {
  formatJobPriority,
  getPriorityStyles,
  type TechnicianJob,
} from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianJobFieldDetail } from "./TechnicianJobFieldDetail";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";
import {
  technicianFieldActiveCardClass,
  technicianFieldActiveJobPillClass,
  technicianFieldCurrentDeckCardClass,
  technicianFieldEmphasizedCardClass,
} from "./technician-field-styles";

type TechnicianJobCardProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  defaultTaxRate: number;
  canCreateEstimate: boolean;
  canApproveOnSite?: boolean;
  canViewBilling?: boolean;
  aiFeaturesEnabled?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  canManageTime?: boolean;
  defaultExpanded?: boolean;
  emphasized?: boolean;
  /** Deck context label for the visible card in TechnicianJobDeck. */
  deckBadge?: "current" | "active";
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
  onStatusUpdated?: (status: JobStatus) => void;
};

/**
 * Inline expandable job card. Production `/technician` uses dispatch-style list
 * cards with {@link TechnicianJobDetailOverlay}; this component remains for
 * deck-style layouts and legacy callers.
 */
export function TechnicianJobCard({
  job,
  timeState,
  serviceItems,
  defaultTaxRate,
  canCreateEstimate,
  canApproveOnSite = false,
  canViewBilling = false,
  aiFeaturesEnabled = false,
  billingContext,
  canManageTime = false,
  defaultExpanded = true,
  emphasized = false,
  deckBadge,
  onStatusUpdated,
}: TechnicianJobCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [closeDisabled, setCloseDisabled] = useState(false);

  const isActiveDeckJob = deckBadge === "active";
  const hasOpenSheet = closeDisabled;

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white ${
        isActiveDeckJob
          ? technicianFieldActiveCardClass
          : emphasized
            ? technicianFieldEmphasizedCardClass
            : deckBadge === "current"
              ? technicianFieldCurrentDeckCardClass
              : "border-slate-200/80 shadow-sm"
      }`}
    >
      <div className="shrink-0 px-2 pt-2">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            {deckBadge ? (
              <p
                className={
                  isActiveDeckJob
                    ? technicianFieldActiveJobPillClass
                    : "text-[10px] font-medium uppercase tracking-wide text-slate-500"
                }
              >
                {isActiveDeckJob ? "Active Job" : "Current Job"}
              </p>
            ) : null}
            <h2
              className={`truncate text-lg font-semibold leading-tight text-slate-900 ${
                deckBadge ? "mt-0.5" : ""
              }`}
            >
              {job.jobNumber}
            </h2>
            <p className="truncate text-sm text-slate-600">{job.jobType}</p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            disabled={hasOpenSheet}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse job details" : "Expand job details"}
            title={
              hasOpenSheet
                ? "Close open forms before collapsing this job"
                : undefined
            }
            className="flex min-h-10 min-w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1 px-0 pb-1">
          <TechnicianJobStatusBadge status={job.status} />
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)}
          </span>
        </div>
      </div>

      {expanded ? (
        <TechnicianJobFieldDetail
          job={job}
          timeState={timeState}
          serviceItems={serviceItems}
          defaultTaxRate={defaultTaxRate}
          canCreateEstimate={canCreateEstimate}
          canApproveOnSite={canApproveOnSite}
          canViewBilling={canViewBilling}
          aiFeaturesEnabled={aiFeaturesEnabled}
          billingContext={billingContext}
          canManageTime={canManageTime}
          showTimeStatus={Boolean(canManageTime && deckBadge)}
          onStatusUpdated={onStatusUpdated}
          onSheetOpenChange={setCloseDisabled}
        />
      ) : (
        <p className="truncate px-2 pb-2 text-sm text-slate-700">
          <DemoDisplayName>{job.customerName}</DemoDisplayName>
        </p>
      )}
    </article>
  );
}
