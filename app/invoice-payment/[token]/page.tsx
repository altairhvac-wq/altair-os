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

  const paymentPanel = !isPaidInFull ? (
    <PublicInvoicePaymentContactPanel
      company={view.company}
      balanceDue={view.invoice.balanceDue}
      dueDate={view.invoice.dueDate}
    />
  ) : undefined;

  return (
    <PublicPaymentShell companyName={companyName}>
      <div className="mb-3 sm:mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
          Secure customer invoice
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 sm:mt-2 sm:text-2xl md:text-3xl">
          {isPaidInFull ? "View your invoice" : "View & pay your invoice"}
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-snug text-slate-600 sm:mt-2 sm:text-sm sm:leading-relaxed">
          {invoiceNumber
            ? `Invoice ${invoiceNumber} from ${companyName}.`
            : `Invoice from ${companyName}.`}{" "}
          {isPaidInFull
            ? "This invoice is paid in full."
            : "Review the details below, then contact the office to arrange payment."}
        </p>
      </div>

      {isPaidInFull ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm sm:mb-6 sm:rounded-2xl sm:p-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 sm:h-6 sm:w-6"
              aria-hidden
            />
            <div>
              <h2 className="text-base font-bold text-emerald-950 sm:text-lg">
                Paid in full
              </h2>
              <p className="mt-1 text-xs leading-snug text-emerald-900 sm:text-sm sm:leading-relaxed">
                No payment is required. Retain this invoice for your records.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <PublicInvoicePaymentDocument
        view={view}
        afterCustomer={paymentPanel}
      />
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
    <main className="min-h-full bg-slate-100 px-3 py-5 sm:px-6 sm:py-8 md:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-3 text-center sm:mb-6 sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
            Altair OS
          </p>
          {companyName ? (
            <p className="mt-0.5 text-xs text-slate-600 sm:mt-1 sm:text-sm">
              {companyName}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}
