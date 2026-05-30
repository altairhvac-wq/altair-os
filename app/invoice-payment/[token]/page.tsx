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
    />
  ) : undefined;

  return (
    <PublicPaymentShell>
      <PublicInvoicePaymentDocument
        view={view}
        afterCustomer={paymentPanel}
      />
    </PublicPaymentShell>
  );
}

function PublicPaymentShell({
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
