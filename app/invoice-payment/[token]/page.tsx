import { CheckCircle2 } from "lucide-react";
import { getPublicInvoicePaymentView } from "@/lib/database/queries/invoice-payment-tokens";
import { PublicInvoicePaymentContactPanel } from "@/shared/components/invoices/PublicInvoicePaymentContactPanel";
import { PublicInvoicePaymentDocument } from "@/shared/components/invoices/PublicInvoicePaymentDocument";

type InvoicePaymentPageProps = {
  params: Promise<{ token: string }>;
};

function PublicPaymentMessage({
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

export default async function InvoicePaymentPage({
  params,
}: InvoicePaymentPageProps) {
  const { token: encodedToken } = await params;
  const rawToken = decodeURIComponent(encodedToken);
  const view = await getPublicInvoicePaymentView(rawToken);

  const companyName = view.company?.name ?? "the company";
  const invoiceNumber = view.invoice?.invoiceNumber;

  if (view.state === "invalid") {
    return (
      <PublicPaymentShell>
        <PublicPaymentMessage
          title="Link not found"
          body="This payment link is invalid. Contact the company that sent your invoice to request a new email."
          tone="warning"
        />
      </PublicPaymentShell>
    );
  }

  if (view.state === "revoked") {
    return (
      <PublicPaymentShell>
        <PublicPaymentMessage
          title="Link replaced"
          body="This payment link is no longer active. Check your email for the most recent invoice message from the company."
          tone="warning"
        />
      </PublicPaymentShell>
    );
  }

  if (view.state === "expired") {
    return (
      <PublicPaymentShell>
        <PublicPaymentMessage
          title="Link expired"
          body={`This payment link has expired. Contact ${companyName} to request a new invoice email.`}
          tone="warning"
        />
      </PublicPaymentShell>
    );
  }

  if (view.state === "unavailable") {
    return (
      <PublicPaymentShell>
        <PublicPaymentMessage
          title="Invoice unavailable"
          body={
            view.message ??
            "This invoice is no longer available for online payment. Contact the company for assistance."
          }
          tone="warning"
        />
      </PublicPaymentShell>
    );
  }

  if (view.state !== "valid" || !view.invoice || !view.company) {
    return (
      <PublicPaymentShell>
        <PublicPaymentMessage
          title="Unable to load invoice"
          body="We couldn't load this invoice. Contact the company that sent the email."
          tone="warning"
        />
      </PublicPaymentShell>
    );
  }

  const isPaidInFull = view.invoice.balanceDue <= 0;

  return (
    <PublicPaymentShell companyName={companyName}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Secure customer invoice
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          {isPaidInFull ? "View your invoice" : "View & pay your invoice"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          {invoiceNumber
            ? `Invoice ${invoiceNumber} from ${companyName}.`
            : `Invoice from ${companyName}.`}{" "}
          {isPaidInFull
            ? "This invoice is paid in full."
            : "Review the details below, then contact the office to arrange payment."}
        </p>
      </div>

      {isPaidInFull ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700"
              aria-hidden
            />
            <div>
              <h2 className="text-lg font-bold text-emerald-950">Paid in full</h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-900">
                No payment is required. Retain this invoice for your records.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <PublicInvoicePaymentContactPanel
            company={view.company}
            balanceDue={view.invoice.balanceDue}
            dueDate={view.invoice.dueDate}
          />
        </div>
      )}

      <PublicInvoicePaymentDocument view={view} />
    </PublicPaymentShell>
  );
}

function PublicPaymentShell({
  children,
  companyName,
}: {
  children: React.ReactNode;
  companyName?: string;
}) {
  return (
    <main className="min-h-full bg-slate-100 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Altair OS
          </p>
          {companyName ? (
            <p className="mt-1 text-sm text-slate-600">{companyName}</p>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}
