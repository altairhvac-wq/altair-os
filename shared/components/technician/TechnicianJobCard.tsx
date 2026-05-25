"use client";

import { Clock, Mail, MapPin, Phone, User } from "lucide-react";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import {
  formatJobPriority,
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  getPriorityStyles,
  type TechnicianJob,
} from "@/shared/types/technician";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

type TechnicianJobCardProps = {
  job: TechnicianJob;
};

export function TechnicianJobCard({ job }: TechnicianJobCardProps) {
  const contactLines = [
    job.customerPhone ? { icon: Phone, value: job.customerPhone } : null,
    job.customerEmail ? { icon: Mail, value: job.customerEmail } : null,
  ].filter((line): line is { icon: typeof Phone; value: string } =>
    Boolean(line),
  );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{job.jobNumber}</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-600">
              {job.jobType}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TechnicianJobStatusBadge status={job.status} />
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)} priority
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {job.customerName}
            </p>
            {contactLines.length > 0 ? (
              <div className="mt-1 space-y-0.5">
                {contactLines.map(({ icon: Icon, value }) => (
                  <p
                    key={value}
                    className="flex items-center gap-1.5 text-xs text-slate-500"
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
          <p className="text-sm text-slate-700">
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

      <div className="border-t border-slate-100 p-4">
        <JobWorkflowControls
          jobId={job.id}
          initialStatus={job.status}
          serviceAddress={job.serviceAddress}
          city={job.city}
          state={job.state}
          zip={job.zip}
          canUpdateStatus
          layout="stack"
        />
      </div>
    </article>
  );
}
