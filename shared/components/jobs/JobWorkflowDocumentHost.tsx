"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createEstimateAction } from "@/app/actions/estimates";
import { createInvoiceAction } from "@/app/actions/invoices";
import { updateJobAction } from "@/app/actions/jobs";
import {
  loadJobWorkflowEstimateCreateDefaultsAction,
  loadJobWorkflowEstimateDocumentAction,
  loadJobWorkflowInvoiceCreateDefaultsAction,
  loadJobWorkflowInvoiceDocumentAction,
  type JobWorkflowEstimateDocumentPayload,
  type JobWorkflowInvoiceDocumentPayload,
} from "@/app/actions/job-workflow-documents";
import { EstimateDetailPageView } from "@/shared/components/estimates/EstimateDetailPageView";
import { EstimateForm } from "@/shared/components/estimates/EstimateForm";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { InvoiceDetailPageView } from "@/shared/components/invoices/InvoiceDetailPageView";
import { InvoiceForm } from "@/shared/components/invoices/InvoiceForm";
import { InvoiceStatusBadge } from "@/shared/components/invoices/InvoiceStatusBadge";
import { FocusedDocumentOverlay } from "@/shared/components/layout/FocusedDocumentOverlay";
import { CompleteJobSheet } from "@/shared/components/jobs/CompleteJobSheet";
import { JobForm, jobToFormData } from "@/shared/components/jobs/JobForm";
import { JobTechnicianAssignment } from "@/shared/components/jobs/JobTechnicianAssignment";
import { JobWorkflowActions } from "@/shared/components/jobs/JobWorkflowActions";
import { scrollToJobDetailSection } from "@/shared/lib/jobs/job-detail-scroll";
import type { JobWorkflowDocument } from "@/shared/lib/jobs/job-workflow-documents";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
} from "@/shared/lib/jobs/job-detail-anchors";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { Customer } from "@/shared/types/customer";
import type { Technician } from "@/shared/types/dispatch";
import type { EstimateFormData } from "@/shared/types/estimate";
import type { InvoiceFormData } from "@/shared/types/invoice";
import type { JobDetail, JobFormData, JobStatus } from "@/shared/types/job";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { JobMaterial } from "@/shared/types/job-material";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { ServiceItem } from "@/shared/types/service-item";
import { formatScheduledDate, formatScheduledTime } from "@/shared/types/job";

export type JobWorkflowDocumentHostProps = {
  job: JobDetail;
  customers: Customer[];
  technicians: Technician[];
  serviceItems: ServiceItem[];
  equipment: CustomerEquipment[];
  materials: JobMaterial[];
  attachments: JobAttachment[];
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  canEditJob: boolean;
  canAssignTechnician: boolean;
  canUpdateStatus: boolean;
  canViewBilling: boolean;
  aiFeaturesEnabled?: boolean;
  northStar?: boolean;
  document: JobWorkflowDocument | null;
  onDocumentChange: (document: JobWorkflowDocument | null) => void;
  triggerElementRef?: React.RefObject<HTMLElement | null>;
};

function customerFromJob(job: JobDetail): Customer {
  return {
    id: job.customerId,
    name: job.customerName,
    email: job.customerEmail ?? "",
    phone: job.customerPhone ?? "",
    company: job.customerCompany,
    status: "active",
    address: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
    totalJobs: 0,
    totalRevenue: 0,
    tags: [],
    createdAt: job.createdAt,
  };
}

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-6 text-sm text-slate-600" role="status">
      {children}
    </p>
  );
}

function WorkScopePanel({
  job,
  equipment,
  materials,
  attachments,
}: {
  job: JobDetail;
  equipment: CustomerEquipment[];
  materials: JobMaterial[];
  attachments: JobAttachment[];
}) {
  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Scope
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
          {job.description?.trim() || "No work description on file."}
        </p>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Notes
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
          {job.notes?.trim() || "No notes on file."}
        </p>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Service address
        </h3>
        <p className="mt-1.5 text-sm text-slate-700">
          {job.serviceAddress}, {job.city}, {job.state} {job.zip}
        </p>
      </section>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Equipment
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-slate-900">
            {equipment.length}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Materials
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-slate-900">
            {materials.length}
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Photos
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-slate-900">
            {attachments.length}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-slate-500">
        Opening this panel does not change job status. Use Work controls or
        Complete work for status transitions.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() =>
            scrollToJobDetailSection(JOB_DETAIL_SCOPE_ANCHOR, {
              updateHash: true,
              focus: true,
            })
          }
        >
          Jump to scope on job
        </button>
      </div>
    </div>
  );
}

function CompletedSummaryPanel({
  job,
  estimates,
  invoices,
}: {
  job: JobDetail;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
}) {
  const estimate = estimates[0];
  const invoice = invoices[0];

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </dt>
          <dd className="mt-0.5 font-semibold text-slate-900">{job.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Completed
          </dt>
          <dd className="mt-0.5 text-slate-700">
            {job.completedAt
              ? `${formatScheduledDate(job.completedAt)} · ${formatScheduledTime(job.completedAt)}`
              : "Not completed"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Technician
          </dt>
          <dd className="mt-0.5 text-slate-700">
            {job.assignedTechnician || "Unassigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Completion notes
          </dt>
          <dd className="mt-0.5 text-slate-700">
            {job.completionNotes?.trim() || "None recorded"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estimate
          </dt>
          <dd className="mt-0.5 text-slate-700">
            {estimate
              ? `${estimate.estimateNumber} (${estimate.status})`
              : "None"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Invoice / payment
          </dt>
          <dd className="mt-0.5 text-slate-700">
            {invoice
              ? `${invoice.invoiceNumber} · ${invoice.status} · balance $${invoice.balanceDue.toFixed(2)}`
              : "None"}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        onClick={() =>
          scrollToJobDetailSection(JOB_DETAIL_ACTIVITY_ANCHOR, {
            updateHash: true,
            focus: true,
          })
        }
      >
        Jump to activity history
      </button>
    </div>
  );
}

export function JobWorkflowDocumentHost({
  job,
  customers,
  technicians,
  serviceItems,
  equipment,
  materials,
  attachments,
  estimates,
  invoices,
  canEditJob,
  canAssignTechnician,
  canUpdateStatus,
  canViewBilling,
  aiFeaturesEnabled = false,
  northStar = false,
  document,
  onDocumentChange,
  triggerElementRef,
}: JobWorkflowDocumentHostProps) {
  const router = useRouter();
  const titleId = useId();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [estimatePayload, setEstimatePayload] =
    useState<JobWorkflowEstimateDocumentPayload | null>(null);
  const [invoicePayload, setInvoicePayload] =
    useState<JobWorkflowInvoiceDocumentPayload | null>(null);
  const [estimateCreateInitial, setEstimateCreateInitial] =
    useState<Partial<EstimateFormData> | null>(null);
  const [invoiceCreateInitial, setInvoiceCreateInitial] =
    useState<Partial<InvoiceFormData> | null>(null);
  const [invoicePrefillNote, setInvoicePrefillNote] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>(job.status);
  const closeButtonRestoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setStatus(job.status);
  }, [job.status]);

  const closeDocument = useCallback(() => {
    onDocumentChange(null);
    setFormError(null);
    setLoadError(null);
    setEstimatePayload(null);
    setInvoicePayload(null);
    setEstimateCreateInitial(null);
    setInvoiceCreateInitial(null);
    setInvoicePrefillNote(null);

    const trigger =
      triggerElementRef?.current ?? closeButtonRestoreRef.current;
    if (trigger) {
      window.requestAnimationFrame(() => {
        trigger.focus();
      });
    }
  }, [onDocumentChange, triggerElementRef]);

  const refreshJob = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!document) {
      return;
    }

    setFormError(null);
    setLoadError(null);
    setEstimatePayload(null);
    setInvoicePayload(null);
    setEstimateCreateInitial(null);
    setInvoiceCreateInitial(null);
    setInvoicePrefillNote(null);

    const kind = document.kind;

    if (
      kind === "estimate-view" ||
      kind === "estimate-approval" ||
      kind === "estimate-chooser"
    ) {
      if (kind === "estimate-chooser") {
        return;
      }

      startTransition(async () => {
        const result = await loadJobWorkflowEstimateDocumentAction(
          document.estimateId,
        );
        if (result.error || !result.data) {
          setLoadError(result.error ?? "Failed to load estimate.");
          return;
        }
        setEstimatePayload(result.data);
      });
      return;
    }

    if (kind === "invoice-view" || kind === "payment") {
      startTransition(async () => {
        const result = await loadJobWorkflowInvoiceDocumentAction(
          document.invoiceId,
        );
        if (result.error || !result.data) {
          setLoadError(result.error ?? "Failed to load invoice.");
          return;
        }
        setInvoicePayload(result.data);
      });
      return;
    }

    if (kind === "estimate-create") {
      startTransition(async () => {
        const result = await loadJobWorkflowEstimateCreateDefaultsAction(
          job.id,
          job.customerId,
        );
        if (result.error) {
          setLoadError(result.error);
          return;
        }
        setEstimateCreateInitial(
          result.initialData ?? {
            customerId: job.customerId,
            jobId: job.id,
            status: "draft",
          },
        );
      });
      return;
    }

    if (kind === "invoice-create") {
      startTransition(async () => {
        const result = await loadJobWorkflowInvoiceCreateDefaultsAction({
          jobId: job.id,
          customerId: job.customerId,
          estimateId: document.estimateId,
        });
        if (result.error) {
          setLoadError(result.error);
          return;
        }
        setInvoiceCreateInitial(
          result.initialData ?? {
            customerId: job.customerId,
            jobId: job.id,
            status: "draft",
          },
        );
        setInvoicePrefillNote(result.estimatePrefillNote ?? null);
      });
    }
  }, [document, job.customerId, job.id]);

  const formCustomers =
    customers.length > 0 ? customers : [customerFromJob(job)];
  const formJobs = [job];

  function handleJobEditSubmit(data: JobFormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateJobAction(job.id, data);
      if (result.error || !result.job) {
        setFormError(
          formatActionError(result.error, "We couldn't save job changes."),
        );
        return;
      }
      closeDocument();
      refreshJob();
    });
  }

  function handleEstimateCreateSubmit(data: EstimateFormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await createEstimateAction({
        ...data,
        customerId: job.customerId,
        jobId: job.id,
      });
      if (result.error || !result.estimate) {
        setFormError(
          formatActionError(result.error, "We couldn't create the estimate."),
        );
        return;
      }
      onDocumentChange({
        kind: "estimate-view",
        estimateId: result.estimate.id,
      });
      refreshJob();
    });
  }

  function handleInvoiceCreateSubmit(data: InvoiceFormData) {
    setFormError(null);
    startTransition(async () => {
      const result = await createInvoiceAction({
        ...data,
        customerId: job.customerId,
        jobId: job.id,
        estimateId: data.estimateId ?? invoiceCreateInitial?.estimateId,
      });
      if (result.error || !result.invoice) {
        setFormError(
          formatActionError(result.error, "We couldn't create the invoice."),
        );
        return;
      }
      onDocumentChange({
        kind: "invoice-view",
        invoiceId: result.invoice.id,
      });
      refreshJob();
    });
  }

  if (!document) {
    return null;
  }

  if (document.kind === "completion") {
    return (
      <CompleteJobSheet
        jobId={job.id}
        customerId={job.customerId}
        currentStatus={status}
        aiFeaturesEnabled={aiFeaturesEnabled}
        onClose={closeDocument}
        onCompleted={(nextStatus) => {
          setStatus(nextStatus);
          refreshJob();
        }}
      />
    );
  }

  const overlayTitle = (() => {
    switch (document.kind) {
      case "job-details":
        return canEditJob ? "Edit job" : "Job details";
      case "technician-assignment":
        return "Technician assignment";
      case "inspection":
        return "Inspection & work scope";
      case "estimate-create":
        return "New estimate";
      case "estimate-chooser":
        return "Choose estimate";
      case "estimate-view":
      case "estimate-approval":
        return estimatePayload?.estimate.estimateNumber ?? "Estimate";
      case "work-controls":
        return "Work controls";
      case "completion-details":
        return "Completion details";
      case "invoice-create":
        return "New invoice";
      case "invoice-view":
        return invoicePayload?.invoice.invoiceNumber ?? "Invoice";
      case "payment":
        return "Record payment";
      case "completed-summary":
        return "Completed job summary";
      default:
        return "Workflow document";
    }
  })();

  const overlaySubtitle = (() => {
    switch (document.kind) {
      case "estimate-create":
        return `${job.customerName} · ${job.jobNumber}`;
      case "invoice-create":
        return invoicePrefillNote ?? `${job.customerName} · ${job.jobNumber}`;
      case "estimate-view":
      case "estimate-approval":
        return estimatePayload?.displayCustomerName;
      case "invoice-view":
      case "payment":
        return invoicePayload?.displayCustomerName;
      default:
        return job.jobNumber;
    }
  })();

  const headerAside = (() => {
    if (
      (document.kind === "estimate-view" ||
        document.kind === "estimate-approval") &&
      estimatePayload
    ) {
      return <EstimateStatusBadge status={estimatePayload.estimate.status} />;
    }
    if (
      (document.kind === "invoice-view" || document.kind === "payment") &&
      invoicePayload
    ) {
      return <InvoiceStatusBadge status={invoicePayload.invoice.status} />;
    }
    return undefined;
  })();

  return (
    <FocusedDocumentOverlay
      isOpen
      onClose={closeDocument}
      title={overlayTitle}
      subtitle={overlaySubtitle}
      headerAside={headerAside}
      closeDisabled={isPending}
      closeVariant="back"
      ariaLabel={overlayTitle}
      northStar={northStar}
      bodyScroll={
        document.kind === "estimate-create" || document.kind === "invoice-create"
          ? "child"
          : "overlay"
      }
    >
      <div
        tabIndex={-1}
        ref={(node) => {
          if (node) {
            node.focus();
          }
        }}
        aria-labelledby={titleId}
        className="outline-none"
      >
        <h2 id={titleId} className="sr-only">
          {overlayTitle}
        </h2>

        {loadError ? <PanelMessage>{loadError}</PanelMessage> : null}

        {!loadError && document.kind === "job-details" ? (
          canEditJob ? (
            <JobForm
              key={job.id}
              customers={formCustomers}
              initialData={jobToFormData(job)}
              onSubmit={handleJobEditSubmit}
              onCancel={closeDocument}
              error={formError}
              isSubmitting={isPending}
              lockStatus
            />
          ) : (
            <WorkScopePanel
              job={job}
              equipment={equipment}
              materials={materials}
              attachments={attachments}
            />
          )
        ) : null}

        {!loadError && document.kind === "technician-assignment" ? (
          <div className="px-4 py-4 sm:px-5">
            <JobTechnicianAssignment
              jobId={job.id}
              jobStatus={status}
              assignedTechnicianId={job.assignedTechnicianId}
              assignedTechnician={job.assignedTechnician}
              technicians={technicians}
              canAssign={canAssignTechnician}
              northStar={northStar}
            />
            {!canAssignTechnician ? (
              <p className="mt-3 text-xs text-slate-500">
                You can view the assigned technician. Dispatch permission is
                required to change assignment.
              </p>
            ) : null}
          </div>
        ) : null}

        {!loadError && document.kind === "inspection" ? (
          <WorkScopePanel
            job={job}
            equipment={equipment}
            materials={materials}
            attachments={attachments}
          />
        ) : null}

        {!loadError && document.kind === "work-controls" ? (
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <p className="text-sm text-slate-600">
              Current status:{" "}
              <span className="font-semibold text-slate-900">{status}</span>
            </p>
            <p className="text-xs text-slate-500">
              Opening this panel does not change status. Use the actions below
              only when you intend to advance the job.
            </p>
            {canUpdateStatus ? (
              <JobWorkflowActions
                jobId={job.id}
                customerId={job.customerId}
                status={status}
                canUpdateStatus={canUpdateStatus}
                aiFeaturesEnabled={aiFeaturesEnabled}
                layout="stack"
                onStatusUpdated={(next) => {
                  setStatus(next);
                  refreshJob();
                }}
              />
            ) : (
              <PanelMessage>
                Status update permission is required for field work controls.
              </PanelMessage>
            )}
            <WorkScopePanel
              job={job}
              equipment={equipment}
              materials={materials}
              attachments={attachments}
            />
          </div>
        ) : null}

        {!loadError && document.kind === "completion-details" ? (
          <CompletedSummaryPanel
            job={job}
            estimates={estimates}
            invoices={invoices}
          />
        ) : null}

        {!loadError && document.kind === "completed-summary" ? (
          <CompletedSummaryPanel
            job={job}
            estimates={estimates}
            invoices={invoices}
          />
        ) : null}

        {!loadError && document.kind === "estimate-chooser" ? (
          <div className="space-y-2 px-4 py-4 sm:px-5">
            <p className="text-sm text-slate-600">
              Multiple estimates are linked to this job. Choose one to open.
            </p>
            <ul className="space-y-2">
              {estimates
                .filter((estimate) =>
                  document.estimateIds.includes(estimate.id),
                )
                .map((estimate) => (
                  <li key={estimate.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                      onClick={() =>
                        onDocumentChange({
                          kind: "estimate-view",
                          estimateId: estimate.id,
                        })
                      }
                    >
                      <span className="font-semibold text-slate-900">
                        {estimate.estimateNumber}
                      </span>
                      <span className="text-slate-500">{estimate.status}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {!loadError &&
        document.kind === "estimate-create" &&
        estimateCreateInitial ? (
          <EstimateForm
            customers={formCustomers}
            jobs={formJobs}
            serviceItems={serviceItems}
            initialData={estimateCreateInitial}
            onSubmit={handleEstimateCreateSubmit}
            onCancel={closeDocument}
            error={formError}
            isSubmitting={isPending}
            aiFeaturesEnabled={aiFeaturesEnabled}
            canDraftDescription={canViewBilling}
          />
        ) : null}

        {!loadError &&
        (document.kind === "estimate-view" ||
          document.kind === "estimate-approval") &&
        estimatePayload ? (
          <EstimateDetailPageView
            estimate={estimatePayload.estimate}
            activities={estimatePayload.activities}
            linkedInvoice={estimatePayload.linkedInvoice}
            company={estimatePayload.company}
            companyTimeZone={estimatePayload.companyTimeZone}
            canManageEstimates={estimatePayload.canManageEstimates}
            canManageCustomers={estimatePayload.canManageCustomers}
            canCaptureSignature={estimatePayload.canCaptureSignature}
            signature={estimatePayload.signature}
            presentation="overlay"
          />
        ) : null}

        {!loadError &&
        document.kind === "invoice-create" &&
        invoiceCreateInitial ? (
          <div>
            {invoicePrefillNote ? (
              <p
                className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-950"
                role="status"
              >
                {invoicePrefillNote}
              </p>
            ) : null}
            <InvoiceForm
              customers={formCustomers}
              jobs={formJobs}
              serviceItems={serviceItems}
              initialData={invoiceCreateInitial}
              onSubmit={handleInvoiceCreateSubmit}
              onCancel={closeDocument}
              error={formError}
              isSubmitting={isPending}
            />
          </div>
        ) : null}

        {!loadError &&
        (document.kind === "invoice-view" || document.kind === "payment") &&
        invoicePayload ? (
          <InvoiceDetailPageView
            invoice={invoicePayload.invoice}
            activities={invoicePayload.activities}
            payments={invoicePayload.payments}
            company={invoicePayload.company}
            companyTimeZone={invoicePayload.companyTimeZone}
            canManageBilling={invoicePayload.canManageBilling}
            canManageCustomers={invoicePayload.canManageCustomers}
            canCaptureSignature={invoicePayload.canCaptureSignature}
            signature={invoicePayload.signature}
            presentation="overlay"
            aiFeaturesEnabled={invoicePayload.aiFeaturesEnabled}
            deleteDependencies={invoicePayload.deleteDependencies}
            onlinePaymentsEnabled={invoicePayload.onlinePaymentsEnabled}
            smsSendingConfigured={invoicePayload.smsSendingConfigured}
          />
        ) : null}

        {!loadError &&
        isPending &&
        (document.kind === "estimate-view" ||
          document.kind === "estimate-approval" ||
          document.kind === "invoice-view" ||
          document.kind === "payment" ||
          document.kind === "estimate-create" ||
          document.kind === "invoice-create") &&
        !estimatePayload &&
        !invoicePayload &&
        !estimateCreateInitial &&
        !invoiceCreateInitial ? (
          <PanelMessage>Loading…</PanelMessage>
        ) : null}
      </div>
    </FocusedDocumentOverlay>
  );
}
