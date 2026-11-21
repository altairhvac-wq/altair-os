import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { formatUsd, pricedPlans } from "@/shared/lib/pricing/plan-calculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { INVOICE_BUILDER_PATH, LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import type { SoftwarePagePath } from "@/shared/lib/site/internal-links";
import { ALTAIR_NOT_YET, type NotYetItem } from "@/shared/lib/site/not-yet";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

/**
 * The words on the four software pages: /hvac-software,
 * /hvac-dispatch-software, /hvac-estimating-software and
 * /hvac-invoicing-software. Paths, titles and descriptions stay in
 * landing-pages.ts (the middleware and robots read that file at the edge).
 *
 * ============ EVERY CLAIM IS IN THE CODE ============
 * Carried over from the checks recorded in landing-pages.ts and the old
 * invoicing-page.ts (2026-11-17), and re-checked 2026-11-20:
 * - draft invoice when a job with an approved estimate is completed, office
 *   notified: lib/database/services/completion-draft-invoice.ts via
 *   app/actions/jobs.ts;
 * - estimate to invoice, invoice on a job, send, batch send, resend:
 *   app/actions/invoices.ts;
 * - pay-by-link by card on the company's own Stripe account:
 *   app/actions/invoice-payment-links.ts, lib/payments/stripe-checkout.ts;
 * - payments as cash, check, card, ACH or other, in full or in part:
 *   shared/types/invoice-payment.ts, app/actions/invoice-payments.ts;
 * - partially paid and overdue statuses, overdue sweep: shared/types/invoice.ts,
 *   lib/database/services/overdue-invoice-sweep.ts;
 * - approval link with printed name, drawn signature and authorization, the
 *   approval creating the job: shared/components/estimates/
 *   PublicEstimateApprovalForm.tsx, app/actions/estimate-public-approval.ts;
 * - assign and reassign on the board (no drag), map of today's job
 *   addresses (no GPS), unassigned queue by priority: app/actions/dispatch.ts
 *   and the sample-company dispatch screenshot;
 * - Print / Save PDF on estimates and invoices: the detail pages
 *   (window.print), visible in the sample screenshots.
 * What is not built is said out loud, from not-yet.ts.
 *
 * Prices come from the plan catalog, never typed here.
 */

export type ShotId = "estimates" | "dispatch" | "invoicing" | "reporting" | "customer-360";

export type SoftwareStep = { readonly title: string; readonly text: string; readonly shot?: ShotId };
export type SoftwareFeature = { readonly title: string; readonly text: string };
export type SoftwareFaq = { readonly id: string; readonly question: string; readonly answer: string };
export type SoftwareLink = { readonly href: string; readonly title: string; readonly text: string; readonly meta?: string };

export type SoftwarePageContent = {
  readonly path: SoftwarePagePath;
  readonly hero: {
    readonly eyebrow: string;
    readonly headline: string;
    readonly intro: string;
    readonly shot: ShotId;
    /** The demo button in the hero. */
    readonly demoLabel: string;
  };
  readonly demo: { readonly eyebrow: string; readonly heading: string; readonly intro: string; readonly anchor: string };
  /** Anchor id for the steps section (keeps an address Google already shows). */
  readonly stepsId?: string;
  readonly stepsHeading: string;
  readonly steps: readonly SoftwareStep[];
  readonly featuresHeading: string;
  readonly features: readonly SoftwareFeature[];
  readonly notYet: readonly NotYetItem[];
  readonly scopeNote: string;
  readonly faqHeading: string;
  readonly faq: readonly SoftwareFaq[];
  readonly toolsHeading: string;
  readonly tools: readonly SoftwareLink[];
  readonly closing: { readonly heading: string; readonly text: string };
};

const TRIAL_DAYS = SAAS_TRIAL_CONFIG.durationDays;
const PLANS = pricedPlans();

function planLine(): string {
  return PLANS.map((plan) => {
    const users =
      plan.extraUserMonthlyUsd !== null
        ? `${plan.includedUsers} users, then ${formatUsd(plan.extraUserMonthlyUsd)}/month each`
        : plan.includedUsers === 1
          ? "1 user"
          : `up to ${plan.includedUsers} users`;
    return `${plan.label} ${formatUsd(plan.monthlyPriceUsd)}/month (${users})`;
  }).join(", ");
}

const PRICE_ANSWER = `${planLine()}. Every plan has every feature; plans differ only in how many users they include. Try it free for ${TRIAL_DAYS} days with no credit card.`;

const PHONE_ANSWER =
  "Altair runs in the phone's web browser on iPhone and Android, and you can add it to the home screen so it opens like an app. There is nothing to download from an app store.";

function notYet(...titles: string[]): NotYetItem[] {
  return titles.flatMap((title) => ALTAIR_NOT_YET.filter((item) => item.title === title));
}

const TOOL = {
  invoiceBuilder: {
    href: INVOICE_BUILDER_PATH,
    title: "Free HVAC invoice template",
    text: "The Invoice Builder: equipment, refrigerant, labor, parts and tax on a printable invoice. No sign-up.",
    meta: "Free tool",
  },
  laborWorkspace: {
    href: LABOR_WORKSPACE_PATH,
    title: "HVAC Labor Cost Workspace",
    text: "Your break-even and recommended hourly rate, with a flat-rate price builder.",
    meta: "Free tool",
  },
  jobProfit: {
    href: calculatorPath("job-profitability"),
    title: "Job profitability calculator",
    text: "What one job really made once labor, parts and overhead are counted.",
    meta: "Free tool",
  },
  breakEven: {
    href: calculatorPath("break-even"),
    title: "HVAC break-even calculator",
    text: "How many jobs a month it takes to cover your fixed costs.",
    meta: "Free tool",
  },
  callback: {
    href: calculatorPath("callback-cost"),
    title: "Callback cost calculator",
    text: "What free return trips cost a month and a year, and the hours they take.",
    meta: "Free tool",
  },
  techPay: {
    href: calculatorPath("technician-pay"),
    title: "Technician pay calculator",
    text: "One real week paid hourly, flat rate and commission, side by side.",
    meta: "Free tool",
  },
  agreement: {
    href: calculatorPath("maintenance-agreement"),
    title: "Maintenance agreement calculator",
    text: "Price a maintenance plan from your cost to serve it.",
    meta: "Free tool",
  },
  whatOnInvoice: {
    href: "/insights/what-to-put-on-an-hvac-invoice",
    title: "What to put on an HVAC invoice",
    text: "A line-by-line checklist, from the equipment to the payment terms.",
    meta: "Guide",
  },
  invoiceGap: {
    href: "/insights/job-completion-to-invoice-gap",
    title: "Why invoices lag behind finished jobs",
    text: "Closing the gap between work done and work billed.",
    meta: "Guide",
  },
  serviceCall: {
    href: "/insights/how-to-price-an-hvac-service-call",
    title: "How to price an HVAC service call",
    text: "A worked example that turns your labor rate into a service call fee.",
    meta: "Guide",
  },
  breakEvenGuide: {
    href: "/insights/hvac-break-even-jobs-per-month",
    title: "HVAC break-even: how many jobs a month?",
    text: "What the break-even number means and how to move it.",
    meta: "Guide",
  },
  startAndGrow: {
    href: "/insights/how-to-start-and-grow-an-hvac-company",
    title: "How to start and grow an HVAC company",
    text: "Pricing, first customers, your first hire and cash flow through the seasons.",
    meta: "Guide",
  },
} as const satisfies Record<string, SoftwareLink>;

// ------------------------------------------------------------------ invoicing

const INVOICING: SoftwarePageContent = {
  path: "/hvac-invoicing-software",
  hero: {
    eyebrow: "HVAC invoicing software",
    headline: "HVAC invoicing software: bill the finished job, get paid from a link.",
    intro:
      "Invoices lag when the office has to rebuild the job from notes before it can bill. In Altair Operating System the invoice is made from the job, with the customer, the address and the approved estimate already on it. Email it, let the customer pay by card from a link, and record cash and checks against the same invoice.",
    shot: "invoicing",
    demoLabel: "Try the invoicing demo",
  },
  demo: {
    eyebrow: "Try it, no sign-up",
    heading: "Invoice a finished job in four steps.",
    intro:
      "A sample service call, start to paid: complete the job, review the draft the estimate became, send it, then take the money from the link or record a check. Change any line and the invoice follows.",
    anchor: "invoicing-demo",
  },
  stepsHeading: "From the finished job to the paid invoice, in five steps.",
  steps: [
    {
      title: "The customer approves the estimate",
      text: "Build the estimate from your price book and send a link. The customer approves and signs on their phone, and the approved estimate becomes the job, so the price they agreed to travels with the work.",
      shot: "estimates",
    },
    {
      title: "The job is done, and the invoice is already drafted",
      text: "When a job with an approved estimate is marked complete, a draft invoice is created from that estimate and the office is told it is ready. No estimate? Create an invoice on any job, or convert an approved estimate yourself.",
    },
    {
      title: "Review it and send it",
      text: "Check the lines, the tax and the due date, then email the invoice to the customer. Send one when it is ready, or the day's batch at once. Print it or save it as a PDF when a customer wants paper.",
    },
    {
      title: "The customer pays from a link, or you record the payment",
      text: "With your Stripe account connected, the customer opens the link and pays by card, with no account and no app. Cash, check, card or ACH taken at the door is recorded against the invoice, in full or in part, so the balance is always right.",
      shot: "invoicing",
    },
    {
      title: "Overdue shows up on its own",
      text: "Sent and partly paid invoices turn overdue when their due date passes. The reports show what was collected, what is outstanding and what is past due, and resending an invoice is one click.",
      shot: "reporting",
    },
  ],
  featuresHeading: "Every part of HVAC invoicing, feature by feature.",
  features: [
    { title: "Invoice from the job", text: "Completing a job with an approved estimate drafts the invoice from it, with the customer, address and job attached." },
    { title: "Invoice from an estimate", text: "Convert an approved estimate into its invoice, so the number the customer agreed to is the number they are billed." },
    { title: "Price-book lines", text: "Services, parts and labor with quantity, rate and amount, picked from your price book or typed, each marked taxable or not." },
    { title: "Tax, terms and due dates", text: "Sales tax from your default rate on the taxable lines, and a due date set from the payment terms you choose in Settings." },
    { title: "Your standard invoice note", text: "Warranty, terms and a thank-you set once in Settings and printed on every invoice." },
    { title: "Send one, or the day's batch", text: "Email an invoice when it is ready, send a batch at once, and resend when a customer asks." },
    { title: "Pay by link", text: "With your own Stripe account connected, the customer pays by card from the link in the email. Altair never stores card numbers." },
    { title: "Record any payment", text: "Cash, check, card, ACH or other, in full or in part. The invoice shows what is paid and what is still owed." },
    { title: "Statuses that stay current", text: "Draft, sent, partially paid, paid and overdue, with overdue applied on its own when the due date passes." },
    { title: "Money reports", text: "Collected, outstanding and overdue for the last 7, 30 or 90 days or the year to date." },
    { title: "Print or save as PDF", text: "Every invoice has a Print / Save PDF button for customers who want paper." },
    { title: "The customer's full history", text: "Each customer record shows their jobs, estimates, invoices, payments and the equipment on site." },
  ],
  notYet: notYet("QuickBooks or other accounting sync", "Automatic payment-reminder emails"),
  scopeNote:
    "Card payments run through your own Stripe account; Altair never stores card numbers. The overdue list is the reminder today, and resending an invoice is one click.",
  faqHeading: "What owners ask about invoicing in Altair.",
  faq: [
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
    { id: "app", question: "Is there an HVAC invoicing app for my phone?", answer: PHONE_ANSWER },
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
    { id: "price", question: "How much does it cost?", answer: PRICE_ANSWER },
    {
      id: "trades",
      question: "Is it only for HVAC companies?",
      answer:
        "It was built by an HVAC company owner for heating and air conditioning companies first. Plumbing, electrical and other field service trades invoice the same way.",
    },
  ],
  toolsHeading: "Get the numbers on the invoice right.",
  tools: [TOOL.invoiceBuilder, TOOL.laborWorkspace, TOOL.whatOnInvoice, TOOL.invoiceGap, TOOL.jobProfit],
  closing: {
    heading: "Bill your next finished job from it.",
    text: `Invoice from the job, send the link, record the payment. If that took less time than today, you have your answer. ${TRIAL_DAYS} days free, no card.`,
  },
};

// ------------------------------------------------------------------ estimating

const ESTIMATING: SoftwarePageContent = {
  path: "/hvac-estimating-software",
  hero: {
    eyebrow: "HVAC estimating software",
    headline: "HVAC estimating software that turns phone approvals into jobs.",
    intro:
      "The slow part of estimating is not writing the number. It is the days of chasing after you send it. Altair builds the estimate from your price book, sends a link the customer approves and signs on their phone, and turns the approved estimate into the job and then the invoice.",
    shot: "estimates",
    demoLabel: "Try the estimate demo",
  },
  demo: {
    eyebrow: "Try it, no sign-up",
    heading: "Price a repair, send it, and get it signed.",
    intro:
      "The price book is the flat-rate builder from the free Labor Cost Workspace: book hours times your labor rate plus parts with markup. Build the estimate, send it, sign it on the customer's phone and watch it become a job.",
    anchor: "estimating-demo",
  },
  stepsHeading: "From price book to approved job, in five steps.",
  steps: [
    {
      title: "Build it from your price book",
      text: "Your parts, labor and services with your prices, so estimates are built from a list instead of from memory. Write it at the desk, or let the technician build it on site from the job they are standing at.",
    },
    {
      title: "Send a link, or approve on site",
      text: "The customer opens the estimate on their phone, with no account and no app. When they are standing next to the technician, they approve on the technician's phone instead.",
    },
    {
      title: "The customer approves and signs",
      text: "A printed name, a signature drawn with a finger and a box to authorize the work. The approval is saved with the estimate.",
      shot: "estimates",
    },
    {
      title: "The approved estimate becomes the job",
      text: "The approval creates the job with the estimate attached, ready for the dispatch board. Nothing is re-entered.",
      shot: "dispatch",
    },
    {
      title: "The job becomes the invoice",
      text: "When the work is done, the approved lines become the draft invoice, and with Stripe connected the customer pays from a link.",
      shot: "invoicing",
    },
  ],
  featuresHeading: "Every part of HVAC estimating, feature by feature.",
  features: [
    { title: "Price book", text: "Your parts, labor and services with your prices, ready to pick from." },
    { title: "Office or field", text: "Build the estimate at the desk, or on site on the technician's phone." },
    { title: "Approval link", text: "The customer opens the estimate on their phone and approves it. No account, no app, no printing." },
    { title: "Signature and authorization", text: "Printed name, a drawn signature and an authorization box, saved with the approval." },
    { title: "Approve on site", text: "Hand the technician's phone to the customer and they sign there." },
    { title: "Valid-until date", text: "Each estimate shows how long it is valid, and approval links expire after a set time." },
    { title: "Becomes the job", text: "Approval creates the job with the estimate attached, ready for the board." },
    { title: "Becomes the invoice", text: "Convert the approved estimate into its invoice, or let the completed job draft it." },
    { title: "Print or save as PDF", text: "Every estimate has a Print / Save PDF button for customers who want paper." },
    { title: "Close rate in the reports", text: "The reports show your estimate close rate next to collected and outstanding money." },
  ],
  notYet: notYet("Good, better, best options on an estimate"),
  scopeNote:
    "Approval links are tied to one estimate and expire after a set time. Flat-rate prices come from the numbers you put in your price book; the free Labor Cost Workspace helps you set them.",
  faqHeading: "What owners ask about estimating in Altair.",
  faq: [
    {
      id: "what-is",
      question: "What is HVAC estimating software?",
      answer:
        "Software for pricing a job and getting the customer's yes. In Altair Operating System you build the estimate from your price book, send a link the customer approves and signs on their phone, and the approved estimate becomes the scheduled job and later the invoice.",
    },
    {
      id: "approve",
      question: "How does the customer approve an estimate?",
      answer:
        "They open the link on their phone, read the estimate, type their name, draw a signature with a finger and tick the box authorizing the work. They need no account and no app. If they are with the technician, they can approve on the technician's phone instead.",
    },
    {
      id: "field",
      question: "Can technicians build estimates in the field?",
      answer:
        "Yes. A technician can build the estimate on site from the job they are on, using the same price book as the office.",
    },
    {
      id: "flat-rate",
      question: "Can I use flat-rate pricing?",
      answer:
        "Yes. Put your flat-rate prices in the price book and estimates are built from them. To work out what those prices should be, the free Labor Cost Workspace turns your wages, overhead and margin into a labor rate and a flat-rate price for each task.",
    },
    {
      id: "after",
      question: "What happens after the customer approves?",
      answer:
        "The approval is saved with the signature, and the approved estimate becomes the job with the estimate attached, ready to schedule on the dispatch board. When the job is done, the same lines become the invoice.",
    },
    {
      id: "options",
      question: "Can I show good, better and best options?",
      answer:
        "Not yet. One estimate carries one set of line items that the customer approves. If you want to offer two choices today, send two estimates.",
    },
    { id: "app", question: "Is there an estimating app for my phone?", answer: PHONE_ANSWER },
    { id: "price", question: "How much does it cost?", answer: PRICE_ANSWER },
  ],
  toolsHeading: "Set prices worth sending.",
  tools: [TOOL.laborWorkspace, TOOL.serviceCall, TOOL.jobProfit, TOOL.agreement, TOOL.invoiceBuilder],
  closing: {
    heading: "Send your next estimate from it.",
    text: `If the approval comes back faster, you have your answer. ${TRIAL_DAYS} days free, no card.`,
  },
};

// ------------------------------------------------------------------ dispatch

const DISPATCH: SoftwarePageContent = {
  path: "/hvac-dispatch-software",
  hero: {
    eyebrow: "HVAC dispatch software",
    headline: "HVAC dispatch software: one board for the whole day.",
    intro:
      "Dispatch in Altair is not a separate tool bolted onto a calendar. The job on the board is the job the technician opens on their phone, the one the estimate came from, and the one the invoice will be made from.",
    shot: "dispatch",
    demoLabel: "Try the dispatch demo",
  },
  demo: {
    eyebrow: "Try it, no sign-up",
    heading: "Run a sample day: assign, move and refresh.",
    intro:
      "Three technicians, nine jobs and an unassigned queue. Pick a job and give it to someone, move one when the day changes, then check what each technician's phone shows.",
    anchor: "dispatch-demo",
  },
  stepsHeading: "How a job moves through dispatch.",
  steps: [
    {
      title: "The job lands on the board",
      text: "An approved estimate becomes a job, or the office creates one from a call. It waits in the unassigned queue, sorted by priority, until someone takes it.",
    },
    {
      title: "See the day at a glance",
      text: "Today's jobs on a timeline with one row per technician, the job addresses on a map of your service area, and the unassigned queue beside it.",
      shot: "dispatch",
    },
    {
      title: "Assign and reassign",
      text: "Put a job on a technician, take it off, or give it to someone else when the day changes. The job stays linked to the customer and the job record.",
    },
    {
      title: "The technician opens it on their phone",
      text: "Each technician sees only their own jobs, with the customer, the address and the equipment on site. A change shows the next time they open or refresh their jobs.",
    },
    {
      title: "Done means ready to bill",
      text: "When a job with an approved estimate is marked complete, the draft invoice is created from it and the office is told.",
      shot: "invoicing",
    },
  ],
  featuresHeading: "Every part of HVAC dispatch, feature by feature.",
  features: [
    { title: "The day's board", text: "Every scheduled job for the day on a timeline, one row per technician." },
    { title: "Unassigned queue", text: "Jobs waiting for a technician, sorted by priority, beside the board." },
    { title: "Assign and reassign", text: "Give a job to a technician, take it off, or move it, without retyping anything." },
    { title: "A map of the work", text: "Today's job addresses on a map of your service area, so close jobs are easy to group." },
    { title: "Today's counts", text: "Jobs today, in progress and completed at the top of the board." },
    { title: "The week's schedule", text: "A calendar of what is booked for the days ahead, next to the board for today." },
    { title: "Technician phone view", text: "Each technician's own jobs with the customer, address and equipment on site." },
    { title: "Time clock", text: "Technicians clock in and out, and shift and job hours sit next to the jobs they belong to." },
    { title: "One record", text: "The customer, the approved estimate and the invoice are the same record the board shows." },
  ],
  notYet: notYet("Drag-and-drop scheduling", "Automatic routing or live GPS", "An app in the App Store or Google Play"),
  scopeNote:
    "The board assigns and reassigns by technician. It does not route a whole day automatically; a dispatcher still decides who goes where.",
  faqHeading: "What owners ask about dispatch in Altair.",
  faq: [
    {
      id: "what-is",
      question: "What is HVAC dispatch software?",
      answer:
        "Software for deciding which technician goes to which job, and getting the job to them. In Altair Operating System the day's jobs sit on one board with a row per technician, you assign and reassign them, and each technician opens their own jobs on their phone.",
    },
    {
      id: "drag",
      question: "Can I drag jobs around the board?",
      answer:
        "Not yet. You assign, reassign or unassign a job by choosing the technician, and its booked time stays the same. Drag-and-drop scheduling is on the list of things Altair does not do yet.",
    },
    {
      id: "gps",
      question: "Does it track trucks or route the day?",
      answer:
        "No. The map shows today's job addresses so you can see which jobs sit close together, not where the trucks are, and it does not plan routes. A dispatcher decides who goes where.",
    },
    {
      id: "phone",
      question: "How do technicians see their jobs?",
      answer: `Each technician signs in on their phone and sees only their own jobs for the day, with the customer, the address and the equipment. A change on the board shows the next time they open or refresh the list. ${PHONE_ANSWER}`,
    },
    {
      id: "small",
      question: "Is it worth it for a small shop?",
      answer:
        "The board earns its keep once more than one person is in the field. A one-person shop still gets the schedule, the phone view and the job record that becomes the invoice, on the one-user plan.",
    },
    { id: "price", question: "How much does it cost?", answer: PRICE_ANSWER },
  ],
  toolsHeading: "Plan the day around the numbers.",
  tools: [TOOL.breakEven, TOOL.callback, TOOL.techPay, TOOL.breakEvenGuide, TOOL.laborWorkspace],
  closing: {
    heading: "Run tomorrow's board on it.",
    text: `One day of real jobs tells you more than any demo. The trial is free for ${TRIAL_DAYS} days and needs no card.`,
  },
};

// ------------------------------------------------------------------ the whole system

const BUSINESS: SoftwarePageContent = {
  path: "/hvac-software",
  hero: {
    eyebrow: "HVAC business software",
    headline: "Software for running an HVAC company, from the first call to the paid invoice.",
    intro:
      "Altair keeps the customer, the job, the technician and the money on one record. The office and the field see the same day, and nothing is retyped into a second tool.",
    shot: "customer-360",
    demoLabel: "Follow one job through it",
  },
  demo: {
    eyebrow: "Follow one job",
    heading: "One job, five stops, one record.",
    intro:
      "Click through the life of a job in the real product, shown with a sample company. Each stop opens the page and the hands-on demo for that part of the work.",
    anchor: "journey",
  },
  // Search Console shows /hvac-software#onboarding; the trial steps keep the anchor.
  stepsId: "onboarding",
  stepsHeading: `${TRIAL_DAYS} days with the whole system. Then decide.`,
  steps: [
    { title: "Create your account", text: "Name, company, email, password. No card." },
    { title: "Confirm your email", text: "One link in your inbox opens your workspace." },
    {
      title: "Look around with sample data, or bring a real job",
      text: "Load sample customers and jobs from Settings and clear them in one step, or take one real job from estimate to paid invoice. That is the test that matters.",
    },
    {
      title: "Choose a plan, or let it end",
      text: "On the last day nothing is charged. Pick a plan and add a card to keep going; otherwise the trial ends and your records stay put.",
    },
  ],
  featuresHeading: "The whole job, in the order it happens.",
  features: [
    { title: "Leads", text: "Log every call and web inquiry as a lead with a next step, so nothing waits in a voicemail." },
    { title: "Customers and their equipment", text: "One record per customer: contacts, addresses, the units on site, service history, estimates and invoices." },
    { title: "Jobs and dispatch", text: "Scope the job, put it on the board, assign the technician, and move it when the day changes." },
    { title: "A technician view for the field", text: "Technicians open the day's jobs on their phone, see the customer and the equipment, and record what they did." },
    { title: "Estimates customers approve from their phone", text: "Build the estimate, send a link, and get the approval back without chasing. Approved work becomes the job." },
    { title: "Invoices and payment links", text: "Completed work becomes the invoice with the job attached. With Stripe connected, customers pay from the link." },
    { title: "Time clock, timesheets and expenses", text: "Shift and job hours and receipts live next to the jobs they belong to. Approve each technician's timesheet for the month, ready for your payroll provider." },
    { title: "Reports", text: "Revenue, job activity and team performance from the same records your team works in, not a spreadsheet export." },
    { title: "A one-on-one setup call", text: "Every plan includes a setup call on Zoom, booked from your workspace." },
  ],
  notYet: notYet("QuickBooks or other accounting sync", "A built-in phone system", "Automatic routing or live GPS", "Importing equipment or job history"),
  scopeNote:
    "Built by an HVAC company owner, for HVAC companies first. Plumbing, electrical and other field service trades run on the same workflow.",
  faqHeading: "What owners ask before they switch.",
  faq: [
    {
      id: "what-is",
      question: "What is HVAC business software?",
      answer:
        "One system for the whole job: the lead, the customer and their equipment, the estimate, the schedule, the technician's day, the invoice and the payment, and the reports that come from all of it. Altair Operating System keeps all of it on one record.",
    },
    {
      id: "included",
      question: "What is included?",
      answer:
        "Leads, customers and equipment, estimates with phone approval, jobs and dispatch, the technician phone view, invoices and payment links, time clock, timesheets and expenses, reports and a one-on-one setup call. Every plan includes all of it.",
    },
    {
      id: "import",
      question: "Can I bring my customers over?",
      answer:
        "Yes. Import your customer list as a CSV file exported from your current software, QuickBooks or a spreadsheet. It brings over names, phone numbers, emails and addresses. Equipment and job history do not come across.",
    },
    {
      id: "sample-data",
      question: "Can I look around before adding my own customers?",
      answer:
        "Yes. From Settings you can load a full set of sample customers, jobs, estimates and invoices, try everything, then clear them in one step before adding your own.",
    },
    { id: "phone", question: "Is there a phone app?", answer: PHONE_ANSWER },
    {
      id: "data-out",
      question: "Can I get my data out if I leave?",
      answer: `Yes. Your data is yours. An owner or admin can download every record in the workspace as one file from Settings, during the trial or while subscribed. If your access has already ended, email ${SUPPORT_EMAIL} and we send you the file.`,
    },
    { id: "price", question: "How much does it cost?", answer: PRICE_ANSWER },
  ],
  toolsHeading: "Check your numbers before you decide anything.",
  tools: [TOOL.laborWorkspace, TOOL.invoiceBuilder, TOOL.breakEven, TOOL.jobProfit, TOOL.startAndGrow],
  closing: {
    heading: "Run one real job through it this week.",
    text: "Estimate, approval, dispatch, invoice, payment. If it holds up on a real job, it will hold up on the rest.",
  },
};

export const SOFTWARE_PAGE_CONTENT: Record<SoftwarePagePath, SoftwarePageContent> = {
  "/hvac-invoicing-software": INVOICING,
  "/hvac-estimating-software": ESTIMATING,
  "/hvac-dispatch-software": DISPATCH,
  "/hvac-software": BUSINESS,
};
