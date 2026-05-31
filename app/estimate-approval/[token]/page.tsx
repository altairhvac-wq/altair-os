import { CheckCircle2 } from "lucide-react";
import { getPublicEstimateApprovalView } from "@/lib/database/queries/estimate-approval-tokens";
import { PublicEstimateApprovalDocument } from "@/shared/components/estimates/PublicEstimateApprovalDocument";
import { PublicEstimateApprovalForm } from "@/shared/components/estimates/PublicEstimateApprovalForm";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";

type EstimateApprovalPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ approved?: string }>;
};

function PublicApprovalMessage({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${toneClasses}`}>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

export default async function EstimateApprovalPage({
  params,
  searchParams,
}: EstimateApprovalPageProps) {
  const { token: encodedToken } = await params;
  const { approved: approvedParam } = await searchParams;
  const rawToken = decodeURIComponent(encodedToken);
  const view = await getPublicEstimateApprovalView(rawToken);
  const showApprovedConfirmation = approvedParam === "1";

  const companyName = view.company?.name ?? "the company";
  const estimateNumber = view.estimate?.estimateNumber;

  if (view.state === "invalid") {
    return (
      <PublicApprovalShell>
        <PublicApprovalMessage
          title="Link not found"
          body="This approval link is invalid. Contact the company that sent your estimate to request a new email."
          tone="warning"
        />
      </PublicApprovalShell>
    );
  }

  if (view.state === "revoked") {
    return (
      <PublicApprovalShell>
        <PublicApprovalMessage
          title="Link replaced"
          body="This approval link is no longer active. Check your email for the most recent estimate message from the company."
          tone="warning"
        />
      </PublicApprovalShell>
    );
  }

  if (view.state === "expired") {
    return (
      <PublicApprovalShell>
        <PublicApprovalMessage
          title="Link expired"
          body={`This approval link has expired. Contact ${companyName} to request a new estimate email.`}
          tone="warning"
        />
      </PublicApprovalShell>
    );
  }

  if (view.state === "unavailable") {
    return (
      <PublicApprovalShell>
        <PublicApprovalMessage
          title="Estimate unavailable"
          body={
            view.message ??
            "This estimate is no longer available for approval. Contact the company for assistance."
          }
          tone="warning"
        />
      </PublicApprovalShell>
    );
  }

  const isAlreadyApproved =
    view.estimateStatus === "approved" ||
    view.state === "used" ||
    showApprovedConfirmation;

  if (isAlreadyApproved) {
    const signedAt = view.signature?.signedAt;
    const signerName = view.signature?.signerName;

    return (
      <PublicApprovalShell companyName={companyName}>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700"
              aria-hidden
            />
            <div>
              <h1 className="text-xl font-bold text-emerald-950">
                Estimate approved
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900">
                {estimateNumber
                  ? `Thank you. Estimate ${estimateNumber} has been approved.`
                  : "Thank you. This estimate has been approved."}
                {signerName ? ` Signed by ${signerName}.` : ""}
                {signedAt
                  ? ` Recorded ${formatDateTimeInTimeZone(signedAt, undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}.`
                  : ""}
              </p>
              <p className="mt-3 text-sm text-emerald-800">
                {companyName} has been notified and will contact you to schedule
                the work. If you have questions, use the contact information on
                your estimate email.
              </p>
            </div>
          </div>
        </div>

        {view.estimate && view.company ? (
          <div className="mt-4 opacity-90 sm:mt-6">
            <PublicEstimateApprovalDocument view={view} />
          </div>
        ) : null}
      </PublicApprovalShell>
    );
  }

  if (view.state !== "valid" || !view.estimate || !view.company) {
    return (
      <PublicApprovalShell>
        <PublicApprovalMessage
          title="Unable to load estimate"
          body="We couldn't load this estimate for review. Contact the company that sent the email."
          tone="warning"
        />
      </PublicApprovalShell>
    );
  }

  if (view.estimate.status !== "sent") {
    return (
      <PublicApprovalShell companyName={companyName}>
        <PublicApprovalMessage
          title="Not available for signing"
          body={`Estimate ${view.estimate.estimateNumber} is not awaiting customer approval. Contact ${companyName} if you need help.`}
          tone="warning"
        />
      </PublicApprovalShell>
    );
  }

  const approvalForm = <PublicEstimateApprovalForm rawToken={rawToken} />;

  return (
    <PublicApprovalShell>
      <PublicEstimateApprovalDocument
        view={view}
        afterCustomer={approvalForm}
      />
    </PublicApprovalShell>
  );
}

function PublicApprovalShell({
  children,
}: {
  children: React.ReactNode;
  companyName?: string;
}) {
  return (
    <main className="min-h-full overflow-x-hidden bg-slate-50 px-3 py-2 sm:px-6 sm:py-8">
      <div className="mx-auto w-full min-w-0 max-w-lg sm:max-w-2xl">
        {children}
      </div>
    </main>
  );
}
