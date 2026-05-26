"use client";

import { useEffect, useState } from "react";
import { Clock, Mail, MapPin, Package, Phone, Receipt, User } from "lucide-react";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
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
import { TechnicianExpenseSheet } from "./TechnicianExpenseSheet";
import { TechnicianJobLaborControls } from "./TechnicianJobLaborControls";
import { TechnicianMaterialSheet } from "./TechnicianMaterialSheet";
import type { ServiceItem } from "@/shared/types/service-item";

type TechnicianJobCardProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
};

export function TechnicianJobCard({
  job,
  timeState,
  serviceItems,
  onTimeStateChange,
}: TechnicianJobCardProps) {
  const [status, setStatus] = useState(job.status);
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [showMaterialSheet, setShowMaterialSheet] = useState(false);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status) ? job.status : current,
    );
  }, [job.status]);

  useEffect(() => {
    if (status === "completed" || status === "cancelled") {
      setShowMaterialSheet(false);
      setShowExpenseSheet(false);
    }
  }, [status]);

  const contactLines = [
    job.customerPhone ? { icon: Phone, value: job.customerPhone } : null,
    job.customerEmail ? { icon: Mail, value: job.customerEmail } : null,
  ].filter((line): line is { icon: typeof Phone; value: string } =>
    Boolean(line),
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">{job.jobNumber}</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              {job.jobType}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TechnicianJobStatusBadge status={status} />
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)} priority
          </span>
        </div>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {job.customerName}
            </p>
            {contactLines.length > 0 ? (
              <div className="mt-1 space-y-0.5">
                {contactLines.map(({ icon: Icon, value }) => (
                  <p
                    key={value}
                    className="flex items-center gap-1.5 break-all text-xs text-slate-500"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {value}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                No contact info on file
              </p>
            )}
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
          onStatusUpdated={setStatus}
        />
        {status !== "completed" && status !== "cancelled" ? (
          <>
            <TechnicianJobLaborControls
              jobId={job.id}
              jobNumber={job.jobNumber}
              timeState={timeState}
              onTimeStateChange={onTimeStateChange}
            />
            <button
              type="button"
              onClick={() => setShowMaterialSheet(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100"
            >
              <Package className="h-4 w-4" />
              Log material
            </button>
            <button
              type="button"
              onClick={() => setShowExpenseSheet(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              <Receipt className="h-4 w-4" />
              Snap receipt
            </button>
          </>
        ) : null}
      </div>

      {showMaterialSheet ? (
        <TechnicianMaterialSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          serviceItems={serviceItems}
          onClose={() => setShowMaterialSheet(false)}
        />
      ) : null}

      {showExpenseSheet ? (
        <TechnicianExpenseSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          onClose={() => setShowExpenseSheet(false)}
        />
      ) : null}
    </article>
  );
}
