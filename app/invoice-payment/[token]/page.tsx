import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import {
  getPublicInvoicePaymentView,
  resolvePublicInvoicePaymentTokenContext,
} from "@/lib/database/queries/invoice-payment-tokens";
import { validateStripeInvoiceCheckoutReadiness } from "@/lib/payments/stripe-checkout";
import { PublicDocumentBrandFooter } from "@/shared/components/brand/PublicDocumentBrandFooter";
import { PublicInvoicePaymentContactPanel } from "@/shared/components/invoices/PublicInvoicePaymentContactPanel";
import { PublicInvoicePaymentDocument } from "@/shared/components/invoices/PublicInvoicePaymentDocument";
import { PublicInvoicePayNowCard } from "@/shared/components/invoices/PublicInvoicePayNowCard";
import { isInvoicePayable } from "@/shared/types/invoice-payment";

type InvoicePaymentPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ checkout?: string }>;
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
  searchParams,
}: InvoicePaymentPageProps) {
  const { token: encodedToken } = await params;
  const { checkout } = await searchParams;
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
  const isPayable =
    !isPaidInFull &&
    isInvoicePayable(view.invoice.status) &&
    view.invoice.balanceDue > 0;

  let onlineCheckoutAvailable = false;

  if (isPayable) {
    const tokenContext = await resolvePublicInvoicePaymentTokenContext(rawToken);

    if (
      tokenContext.state === "valid" &&
      tokenContext.invoiceId === view.invoice.id
    ) {
      const paymentAccount = await getCompanyPaymentAccount(
        tokenContext.companyId,
        "stripe",
      );
      const readiness = validateStripeInvoiceCheckoutReadiness(paymentAccount, {
        id: view.invoice.id,
        invoiceNumber: view.invoice.invoiceNumber,
        balanceDue: view.invoice.balanceDue,
        status: view.invoice.status,
      });
      onlineCheckoutAvailable = readiness.ok;
    }
  }

  const checkoutStatusMessage =
    checkout === "success" ? (
      <PublicPaymentMessage
        title="Payment submitted"
        body="Your payment was submitted. This invoice will update once payment is confirmed."
        tone="success"
      />
    ) : checkout === "cancelled" ? (
      <PublicPaymentMessage
        title="Payment cancelled"
        body="Payment was cancelled. You can try again or contact the company for help."
        tone="warning"
      />
    ) : null;

  const paymentPanel = !isPaidInFull ? (
    <div className="space-y-3">
      {onlineCheckoutAvailable ? (
        <>
          <PublicInvoicePayNowCard
            token={rawToken}
            balanceDue={view.invoice.balanceDue}
          />
          <PublicInvoicePaymentContactPanel
            company={view.company}
            balanceDue={view.invoice.balanceDue}
            variant="secondary"
          />
        </>
      ) : (
        <PublicInvoicePaymentContactPanel
          company={view.company}
          balanceDue={view.invoice.balanceDue}
        />
      )}
    </div>
  ) : undefined;

  return (
    <PublicPaymentShell>
      {checkoutStatusMessage ? (
        <div className="mb-4">{checkoutStatusMessage}</div>
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
}: {
  children: React.ReactNode;
  companyName?: string;
}) {
  return (
    <main className="min-h-full overflow-x-hidden bg-slate-50 px-3 py-2 sm:px-6 sm:py-8">
      <div className="mx-auto w-full min-w-0 max-w-lg sm:max-w-2xl">
        {children}
        <PublicDocumentBrandFooter />
      </div>
    </main>
  );
}
