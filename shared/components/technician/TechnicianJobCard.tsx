"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  MapPin,
  Package,
  Receipt,
  User,
} from "lucide-react";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import type { JobStatus } from "@/shared/types/job";
import {
  formatJobPriority,
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  getPriorityStyles,
  type TechnicianJob,
} from "@/shared/types/technician";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import { TechnicianCustomerQuickActions } from "./TechnicianCustomerQuickActions";
import { TechnicianExpenseSheet } from "./TechnicianExpenseSheet";
import { TechnicianJobEquipmentSummary } from "./TechnicianJobEquipmentSummary";
import { TechnicianJobLaborControls } from "./TechnicianJobLaborControls";
import { TechnicianMaterialSheet } from "./TechnicianMaterialSheet";
import { TechnicianPhotoSheet } from "./TechnicianPhotoSheet";
import type { ServiceItem } from "@/shared/types/service-item";

type TechnicianJobCardProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  defaultExpanded?: boolean;
  emphasized?: boolean;
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
  onStatusUpdated?: (status: JobStatus) => void;
};

const fieldActionClass =
  "inline-flex min-h-11 min-w-11 touch-manipulation flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors";

export function TechnicianJobCard({
  job,
  timeState,
  serviceItems,
  defaultExpanded = true,
  emphasized = false,
  onTimeStateChange,
  onStatusUpdated,
}: TechnicianJobCardProps) {
  const [status, setStatus] = useState(job.status);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeSheet, setActiveSheet] = useState<
    "material" | "expense" | "photo" | null
  >(null);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status) ? job.status : current,
    );
  }, [job.status]);

  useEffect(() => {
    if (status === "completed" || status === "cancelled") {
      setActiveSheet(null);
    }
  }, [status]);

  function handleStatusUpdated(nextStatus: JobStatus) {
    setStatus(nextStatus);
    onStatusUpdated?.(nextStatus);
  }

  const hasJobNotes = Boolean(job.description?.trim() || job.notes?.trim());
  const isActive = status !== "completed" && status !== "cancelled";

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        emphasized
          ? "border-cyan-300 ring-2 ring-cyan-500/20"
          : "border-slate-200"
      }`}
    >
      <div className="border-b border-slate-100 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900">
              {job.jobNumber}
            </h2>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-600">
              {job.jobType}
            </p>
            {!expanded ? (
              <p className="mt-1 truncate text-sm text-slate-700">
                {job.customerName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse job details" : "Expand job details"}
            className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TechnicianJobStatusBadge status={status} />
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)} priority
          </span>
        </div>

        {!expanded ? (
          <div className="mt-3 space-y-2">
            <TechnicianCustomerQuickActions job={job} />
            <JobWorkflowControls
              jobId={job.id}
              customerId={job.customerId}
              initialStatus={status}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
              canUpdateStatus
              layout="stack"
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        ) : null}
      </div>

      {expanded ? (
        <>
          <div className="space-y-3 p-3 sm:p-4">
            <TechnicianCustomerQuickActions job={job} />

            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {job.customerName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="min-w-0 break-words text-sm text-slate-700">
                {formatTechnicianJobAddress(job)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                Scheduled {formatTechnicianJobTime(job.scheduledDate)}
              </p>
            </div>

            {hasJobNotes ? (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Job notes
                  </p>
                </div>
                {job.description?.trim() ? (
                  <p className="text-sm text-slate-800">{job.description}</p>
                ) : null}
                {job.notes?.trim() ? (
                  <p
                    className={`text-sm text-slate-700 ${job.description?.trim() ? "mt-1.5 border-t border-amber-200/60 pt-1.5" : ""}`}
                  >
                    {job.notes}
                  </p>
                ) : null}
              </div>
            ) : null}

            <TechnicianJobEquipmentSummary
              customerId={job.customerId}
              expanded={expanded}
            />
          </div>

          <div className="space-y-3 border-t border-slate-100 p-3 sm:p-4">
            <JobWorkflowControls
              jobId={job.id}
              customerId={job.customerId}
              initialStatus={status}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
              canUpdateStatus
              layout="stack"
              onStatusUpdated={handleStatusUpdated}
            />
            {isActive ? (
              <>
                <TechnicianJobLaborControls
                  jobId={job.id}
                  jobNumber={job.jobNumber}
                  timeState={timeState}
                  onTimeStateChange={onTimeStateChange}
                />
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={activeSheet !== null}
                    onClick={() => setActiveSheet("material")}
                    className={`${fieldActionClass} border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="truncate">Material</span>
                  </button>
                  <button
                    type="button"
                    disabled={activeSheet !== null}
                    onClick={() => setActiveSheet("expense")}
                    className={`${fieldActionClass} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Receipt className="h-4 w-4 shrink-0" />
                    <span className="truncate">Receipt</span>
                  </button>
                  <button
                    type="button"
                    disabled={activeSheet !== null}
                    onClick={() => setActiveSheet("photo")}
                    className={`${fieldActionClass} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <Camera className="h-4 w-4 shrink-0" />
                    <span className="truncate">Photo</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {activeSheet === "material" ? (
        <TechnicianMaterialSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          serviceItems={serviceItems}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}

      {activeSheet === "expense" ? (
        <TechnicianExpenseSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}

      {activeSheet === "photo" ? (
        <TechnicianPhotoSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}
    </article>
  );
}
