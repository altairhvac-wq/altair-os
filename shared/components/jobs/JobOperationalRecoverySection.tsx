import Link from "next/link";
import { AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import {
  formatOperationalInconsistencyKind,
  getOperationalInconsistencyRecoveryGuidance,
  type OperationalInconsistencyEntry,
} from "@/shared/types/operational-inconsistencies";
import {
  isValidQueueActionHref,
  safeBuildQueueActionHref,
} from "@/shared/types/office-review-queue";

type JobOperationalRecoverySectionProps = {
  jobId: string;
  entries: OperationalInconsistencyEntry[];
};

function resolveRecoveryHref(
  jobId: string,
  entry: OperationalInconsistencyEntry,
): string | null {
  switch (entry.kind) {
    case "stale_active_dispatch_on_terminal_job":
    case "job_assigned_without_active_dispatch":
    case "active_dispatch_without_job_assignment":
    case "dispatch_technician_mismatch":
    case "invalid_assigned_technician":
      return safeBuildQueueActionHref("/dispatch");
    case "open_labor_on_cancelled_job":
      return safeBuildQueueActionHref("/time", { jobId });
    case "invoice_balance_mismatch":
      return entry.invoiceId
        ? safeBuildQueueActionHref(`/invoices/${encodeURIComponent(entry.invoiceId)}`)
        : safeBuildQueueActionHref("/invoices", { jobId });
    default:
      return safeBuildQueueActionHref(`/jobs/${encodeURIComponent(jobId)}`);
  }
}

export function JobOperationalRecoverySection({
  jobId,
  entries,
}: JobOperationalRecoverySectionProps) {
  if (entries.length === 0) {
    return null;
  }

  const hasCritical = entries.some((entry) => entry.severity === "critical");

  return (
    <section
      aria-labelledby={`job-operational-recovery-heading-${jobId}`}
      className={`rounded-2xl border p-5 shadow-sm ${
        hasCritical
          ? "border-rose-200 bg-rose-50/40"
          : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 h-5 w-5 shrink-0 ${hasCritical ? "text-rose-700" : "text-amber-700"}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2
            id={`job-operational-recovery-heading-${jobId}`}
            className="text-sm font-bold text-slate-900"
          >
            Operational data integrity
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Read-only scan — follow the steps below to reconcile records manually.
            No automatic repairs run from this panel.
          </p>

          <ul className="mt-4 space-y-3">
            {entries.map((entry) => {
              const href = resolveRecoveryHref(jobId, entry);
              const external =
                href != null &&
                (href.startsWith("/dispatch") ||
                  href.startsWith("/time") ||
                  href.startsWith("/invoices"));

              return (
                <li
                  key={`${entry.kind}-${entry.invoiceId ?? "job"}`}
                  className="rounded-xl border border-white/80 bg-white/90 px-3 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatOperationalInconsistencyKind(entry.kind)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">{entry.detail}</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-700">
                        {getOperationalInconsistencyRecoveryGuidance(entry.kind)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        entry.severity === "critical"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {entry.severity}
                    </span>
                  </div>

                  {href && isValidQueueActionHref(href) ? (
                    <Link
                      href={href}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                    >
                      Open recovery path
                      {external ? (
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      )}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
