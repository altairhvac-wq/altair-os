import { SAAS_TRIAL_CONFIG, describePlanAccounts, listPublicSaasCatalogPlans } from "@/lib/saas-billing/catalog";

/**
 * The words on /hvac-invoicing-software.
 *
 * ============ WHY THIS PAGE HAS ITS OWN FILE ============
 * Search Console (28 days to 2026-11-15) showed "hvac invoicing software",
 * "hvac invoicing" and "air conditioning invoicing software" as the site's
 * biggest non-brand searches, with this page at position 71: the shared
 * landing template said too little about invoicing for Google to rank it.
 * This page answers the search itself: the job-to-paid flow step by step,
 * what goes on the invoice, real screens, the price, an honest comparison
 * and the questions owners ask.
 *
 * ============ EVERY CLAIM IS IN THE CODE ============
 * Checked 2026-11-17:
 * - draft invoice when a job with an approved estimate is completed, and the
 *   office is notified: lib/database/services/completion-draft-invoice.ts,
 *   called from app/actions/jobs.ts ("complete");
 * - estimate to invoice, invoice on a job, send, batch send, resend:
 *   app/actions/invoices.ts;
 * - pay-by-link by card through the company's own Stripe account:
 *   app/actions/invoice-payment-links.ts, lib/payments/stripe-checkout.ts
 *   (payment_method_types: card);
 * - payments recorded as cash, check, card, ACH or other, in full or part:
 *   shared/types/invoice-payment.ts, app/actions/invoice-payments.ts;
 * - statuses including partially paid and overdue, and the scheduled
 *   overdue sweep: shared/types/invoice.ts,
 *   lib/database/services/overdue-invoice-sweep.ts;
 * - price-book lines, taxable or not, default tax rate, payment terms and
 *   invoice notes: InvoiceLineItemsEditor, company-billing-defaults.ts;
 * - Print / Save PDF: InvoiceDetailPageView (window.print).
 * Not claimed, because they are not built (shared/lib/site/not-yet.ts):
 * QuickBooks sync and automatic payment-reminder emails, and both are said
 * out loud. Text-message payment links exist in code but need an SMS
 * provider the production site does not have, so they are not mentioned.
 *
 * Prices come from the plan catalog, never typed here.
 */

const TRIAL_DAYS = SAAS_TRIAL_CONFIG.durationDays;

function planLine(): string {
  return listPublicSaasCatalogPlans()
    .filter((plan) => typeof plan.monthlyPriceUsd === "number")
    .map((plan) => {
      const accounts = describePlanAccounts(plan);
      return `${plan.label} $${plan.monthlyPriceUsd}/month${accounts ? ` (${accounts.charAt(0).toLowerCase()}${accounts.slice(1)})` : ""}`;
    })
    .join(", ");
}

export function lowestMonthlyPriceUsd(): number | null {
  const prices = listPublicSaasCatalogPlans()
    .map((plan) => plan.monthlyPriceUsd)
    .filter((price): price is number => typeof price === "number");
  return prices.length ? Math.min(...prices) : null;
}

const FROM_PRICE = lowestMonthlyPriceUsd();

export const INVOICING_PAGE_PATH = "/hvac-invoicing-software";

export const INVOICING_META = {
  title: "HVAC Invoicing Software: Invoice From the Job, Get Paid by Link",
  description: `HVAC invoicing software for heating and air conditioning shops: the finished job becomes the invoice and customers pay by card from a link.${FROM_PRICE !== null ? ` From $${FROM_PRICE}/mo,` : ""} ${TRIAL_DAYS}-day free trial.`,
} as const;

export const INVOICING_HERO = {
  eyebrow: "HVAC invoicing software",
  headline: "HVAC invoicing software: bill the finished job, get paid from a link.",
  intro:
    "Invoices lag when the office has to rebuild the job from notes before it can bill. In Altair Operating System the invoice is made from the job, with the customer, the address and the approved estimate already on it. Send it by email, let the customer pay by card from a link, and record cash and checks against the same invoice.",
} as const;

export type InvoicingStep = {
  readonly title: string;
  readonly text: string;
  /** An id from SHOWCASE_ITEMS (the clean sample-company screenshots), when one shows this step. */
  readonly screenshotId?: "estimates" | "dispatch" | "invoicing" | "reporting";
};

/** Job to invoice to paid, in the order it happens. */
export const INVOICING_STEPS: readonly InvoicingStep[] = [
  {
    title: "The customer approves the estimate",
    text: "Build the estimate from your price book and send a link. The customer approves and signs on their phone, and the approved estimate becomes the job, so the price they agreed to travels with the work.",
    screenshotId: "estimates",
  },
  {
    title: "The job is done, and the invoice is already drafted",
    text: "When a job with an approved estimate is marked complete, a draft invoice is created from that estimate and the office is told it is ready. No job? Create an invoice on any job, or convert an approved estimate yourself.",
  },
  {
    title: "Review it and send it",
    text: "Check the lines, the tax and the due date, then email the invoice to the customer. Send one when it is ready, or the day's batch at once. Print it or save it as a PDF when a customer wants paper.",
  },
  {
    title: "The customer pays from a link, or you record the payment",
    text: "With your Stripe account connected, the customer opens the link and pays by card, with no account and no app. Cash, check, card or ACH taken at the door is recorded against the invoice, in full or in part, so the balance is always right.",
    screenshotId: "invoicing",
  },
  {
    title: "Overdue shows up on its own",
    text: "Sent and partly paid invoices turn overdue when their due date passes. The reports show what was collected, what is outstanding and what is past due, and resending an invoice is one click.",
    screenshotId: "reporting",
  },
];

/** What a finished invoice carries, and where each part comes from. */
export const INVOICE_CONTENTS: readonly { readonly title: string; readonly text: string }[] = [
  {
    title: "Your company and the customer",
    text: "Your company name, address, phone and email, and the customer's name and contact details, taken from the customer record.",
  },
  {
    title: "Invoice number and dates",
    text: "A numbered invoice with its issue date and a due date set from the payment terms you choose in Settings.",
  },
  {
    title: "Line items from your price book",
    text: "Services, parts and labor with quantity, rate and amount. Pick lines from the price book or type them, and mark each one taxable or not.",
  },
  {
    title: "Tax, total and balance",
    text: "Sales tax from your default rate on the taxable lines, the invoice total, what has been paid and what is still owed.",
  },
  {
    title: "Notes and the job",
    text: "Your standard invoice note (warranty, terms, thank-you) set once in Settings, and the job the invoice belongs to.",
  },
  {
    title: "A way to pay",
    text: "With Stripe connected, a payment link the customer can open from the email and pay by card.",
  },
];

/** What the page says Altair does not do, from the not-yet list. */
export const INVOICING_LIMITS =
  "Card payments run through your own Stripe account; Altair never stores card numbers. Two things it does not do yet: sync with QuickBooks or other accounting software, and send automatic payment-reminder emails. The overdue list is the reminder, and the resend is one click.";

export type InvoicingFaqItem = { readonly id: string; readonly question: string; readonly answer: string };

export const INVOICING_FAQ: readonly InvoicingFaqItem[] = [
  {
    id: "what-is",
    question: "What is HVAC invoicing software?",
    answer:
      "Software that turns the work your technicians finish into a bill, sends it to the customer, takes or records the payment, and shows who still owes you. In Altair Operating System the invoice is made from the job record, so the customer, the address and the approved estimate are already on it.",
  },
  {
    id: "job-to-invoice",
    question: "How does a finished job become an invoice?",
    answer:
      "When a job with an approved estimate is marked complete, Altair creates a draft invoice from that estimate and tells the office it is ready. You can also convert an approved estimate into an invoice yourself, or create an invoice on any job. Review it, then send it.",
  },
  {
    id: "pay-online",
    question: "Can customers pay an invoice online?",
    answer:
      "Yes, once you connect your Stripe account in Settings. The customer opens the payment link and pays by card, with no account and no app. The money goes to your Stripe account, and Altair never stores card numbers.",
  },
  {
    id: "record-payments",
    question: "Can I record cash, check and partial payments?",
    answer:
      "Yes. Record a payment against the invoice as cash, check, card, ACH or other, in full or in part. The invoice shows what has been paid and what is still owed, and it is marked paid when the balance reaches zero.",
  },
  {
    id: "reminders",
    question: "Does it send automatic payment reminders?",
    answer:
      "Not yet. Sent and partly paid invoices turn overdue when their due date passes, the reports show what is past due, and resending an invoice to the customer is one click.",
  },
  {
    id: "quickbooks",
    question: "Does it sync with QuickBooks?",
    answer:
      "Not today. Invoices, payments and expenses are recorded in Altair, and a customer list exported from QuickBooks can be imported. If QuickBooks sync is a must for you, make sure the system you choose has it.",
  },
  {
    id: "pdf",
    question: "Can I print an invoice or save it as a PDF?",
    answer:
      "Yes. Every invoice has a Print / Save PDF button that opens your browser's print dialog, where you can print it or save it as a PDF.",
  },
  {
    id: "price",
    question: "How much does it cost?",
    answer: `${planLine()}. Every plan has the same features, invoicing and payment links included; plans differ only in how many users they include. Try it free for ${TRIAL_DAYS} days with no credit card.`,
  },
  {
    id: "trades",
    question: "Is it only for HVAC companies?",
    answer:
      "It was built by an HVAC company owner for heating and air conditioning companies first. Plumbing, electrical and other field service trades invoice the same way.",
  },
];
