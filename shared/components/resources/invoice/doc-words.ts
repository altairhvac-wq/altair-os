import { BLANK_INVOICE, BLANK_TEMPLATE_TEXT, SAMPLE_INVOICE, type InvoiceState } from "@/shared/components/resources/invoice/invoice-state";

/**
 * One builder, two documents.
 *
 * The Estimate Builder is the Invoice Builder with different words on it:
 * the same form, the same line items and the same whole-cent totals, so an
 * estimate and the invoice that follows it add up the same way. Everything
 * that differs between the two lives in this file: the labels, the sample,
 * the blank starting point and the plain-text blank template.
 *
 * What an estimate changes:
 *   - it has a "valid until" date instead of a due date;
 *   - nothing has been paid yet, so there is no "paid" line and no balance:
 *     the big number is the estimate total, or the deposit to start;
 *   - "complaint, cause, correction" (work done) becomes "asked for, found,
 *     proposed" (work offered);
 *   - it ends with an acceptance line, not a thank-you.
 *
 * Every name, address, number and price in the sample is made up.
 */

export type DocKind = "invoice" | "estimate";

export type DocWords = {
  /** Analytics label and element id: a slug written here, never anything typed. */
  readonly toolId: string;
  readonly toolName: string;
  readonly noun: string;
  readonly detailsTitle: string;
  readonly numberLabel: string;
  readonly dateLabel: string;
  readonly dueDateLabel: string;
  readonly termsLabel: string;
  readonly termsPlaceholder: string;
  readonly termsChoices: readonly string[];
  /** The document kinds offered (an estimate has no "progress" kind). */
  readonly kinds: readonly { readonly value: InvoiceState["kind"]; readonly label: string }[];
  readonly kindLabel: string;
  readonly workTitle: string;
  readonly work: readonly [
    { readonly label: string; readonly hint: string; readonly placeholder: string },
    { readonly label: string; readonly hint: string; readonly placeholder: string },
    { readonly label: string; readonly hint: string; readonly placeholder: string },
  ];
  readonly moneyTitle: string;
  readonly termsTitle: string;
  readonly payLabel: string;
  readonly payPlaceholder: string;
  readonly intro: string;
  readonly sampleToast: string;
  // ---- the paper
  readonly paperTitle: Record<InvoiceState["kind"], string>;
  readonly paperNumber: string;
  readonly paperDue: string;
  readonly paperParty: string;
  readonly paperEquipment: string;
  readonly paperWork: string;
  readonly paperPay: string;
  readonly paperTerms: string;
  readonly paperTermsHint: string;
  readonly paperSignature: string;
  readonly paperClosing: string;
  readonly blankDueLabel: string;
};

export const DOC_WORDS: Record<DocKind, DocWords> = {
  invoice: {
    toolId: "invoice-builder",
    toolName: "Invoice Builder",
    noun: "invoice",
    detailsTitle: "Invoice details",
    numberLabel: "Invoice number",
    dateLabel: "Invoice date",
    dueDateLabel: "Due date",
    termsLabel: "Payment terms",
    termsPlaceholder: "Due on receipt",
    termsChoices: ["Due on receipt", "Net 15", "Net 30"],
    kinds: [
      { value: "standard", label: "Standard" },
      { value: "deposit", label: "Deposit" },
      { value: "progress", label: "Progress" },
    ],
    kindLabel: "Invoice type",
    workTitle: "Work performed",
    work: [
      { label: "Complaint", hint: "What the customer said was wrong.", placeholder: "e.g. No heat upstairs" },
      { label: "Cause", hint: "What the technician found.", placeholder: "e.g. Flame sensor coated, furnace locking out" },
      { label: "Correction", hint: "What was done, in words the customer understands.", placeholder: "e.g. Cleaned flame sensor, tested three full cycles" },
    ],
    moneyTitle: "Tax, discount and payments",
    termsTitle: "Payment, warranty and permits",
    payLabel: "How to pay",
    payPlaceholder: "Payment link, card, check payable to..., ACH",
    intro: "Four parts make a complete invoice",
    sampleToast: "Sample invoice loaded. Every name and price is made up.",
    paperTitle: { standard: "Invoice", deposit: "Deposit invoice", progress: "Progress invoice" },
    paperNumber: "Invoice no.",
    paperDue: "Due",
    paperParty: "Bill to",
    paperEquipment: "Equipment serviced",
    paperWork: "Work performed",
    paperPay: "How to pay",
    paperTerms: "Terms",
    paperTermsHint: "Due in (days)",
    paperSignature: "Customer signature",
    paperClosing: "Thank you for your business.",
    blankDueLabel: "Balance due",
  },
  estimate: {
    toolId: "estimate-builder",
    toolName: "Estimate Builder",
    noun: "estimate",
    detailsTitle: "Estimate details",
    numberLabel: "Estimate number",
    dateLabel: "Estimate date",
    dueDateLabel: "Valid until",
    termsLabel: "How long the price holds",
    termsPlaceholder: "Valid for 30 days",
    termsChoices: ["Valid for 15 days", "Valid for 30 days", "Valid for 60 days"],
    kinds: [
      { value: "standard", label: "Estimate" },
      { value: "deposit", label: "With a deposit to start" },
    ],
    kindLabel: "Estimate type",
    workTitle: "Scope of work",
    work: [
      { label: "What the customer asked for", hint: "The problem or the request, in their words.", placeholder: "e.g. Upstairs is not cooling" },
      { label: "What we found", hint: "What the technician saw on site.", placeholder: "e.g. Condenser fan motor failing, capacitor weak" },
      { label: "What we propose", hint: "The work this estimate covers, in words the customer understands.", placeholder: "e.g. Replace the condenser fan motor and capacitor, test the system" },
    ],
    moneyTitle: "Tax, discount and deposit",
    termsTitle: "Approval, warranty and permits",
    payLabel: "How to approve",
    payPlaceholder: "Reply to this email, sign below, or call the office",
    intro: "Four parts make a complete estimate",
    sampleToast: "Sample estimate loaded. Every name and price is made up.",
    paperTitle: { standard: "Estimate", deposit: "Estimate", progress: "Estimate" },
    paperNumber: "Estimate no.",
    paperDue: "Valid until",
    paperParty: "Prepared for",
    paperEquipment: "Equipment",
    paperWork: "Scope of work",
    paperPay: "How to approve",
    paperTerms: "This price",
    paperTermsHint: "Valid for (days)",
    paperSignature: "Accepted by (signature)",
    paperClosing: "This is an estimate, not a bill. Nothing is owed until the work is approved.",
    blankDueLabel: "Estimate total",
  },
};

export const BLANK_ESTIMATE: InvoiceState = { ...BLANK_INVOICE, terms: "Valid for 30 days" };

/** The filled-in repair estimate from the guide. All sample data. */
export const SAMPLE_ESTIMATE: InvoiceState = {
  ...SAMPLE_INVOICE,
  number: "E-2051",
  date: "2026-06-09",
  dueDate: "2026-07-09",
  terms: "Valid for 30 days",
  equipmentType: "Split-system air conditioner, outdoor unit",
  refrigerantType: "",
  lbsAdded: "",
  lbsRecovered: "",
  complaint: "Upstairs is not cooling. Outdoor unit is loud and the fan stops and starts.",
  cause: "Condenser fan motor bearings failing and drawing high amps. Run capacitor reading weak.",
  correction: "Replace the condenser fan motor and the run capacitor, clean the condenser coil, and test the system through a full cooling cycle.",
  taxRate: "7",
  discount: "",
  amountPaid: "",
  depositPct: "50",
  paymentInstructions: "Reply to this email with your approval, or sign below and send a photo. We schedule the work the same day.",
  warranty: "1 year on labor for this repair; parts per manufacturer.",
  technician: "J. Sample",
  notes: "The price covers the work listed above. Anything else found once the unit is open is quoted before it is done.",
  kind: "standard",
  lines: [
    { id: "l1", kind: "labor", description: "Labor, replace condenser fan motor and capacitor", partNumber: "", qty: "1.5", price: "121", taxable: false },
    { id: "l2", kind: "part", description: "Condenser fan motor, 1/4 HP", partNumber: "MTR-0250", qty: "1", price: "224", taxable: true },
    { id: "l3", kind: "part", description: "Dual run capacitor 45/5 MFD 440V", partNumber: "CAP-4554", qty: "1", price: "36", taxable: true },
    { id: "l4", kind: "labor", description: "Labor, clean condenser coil", partNumber: "", qty: "0.5", price: "121", taxable: false },
  ],
};

export const SAMPLE_BY_DOC: Record<DocKind, InvoiceState> = { invoice: SAMPLE_INVOICE, estimate: SAMPLE_ESTIMATE };
export const BLANK_BY_DOC: Record<DocKind, InvoiceState> = { invoice: BLANK_INVOICE, estimate: BLANK_ESTIMATE };

/** The plain-text estimate the "Copy blank template" button puts on the clipboard. */
export const BLANK_ESTIMATE_TEXT = `HVAC ESTIMATE

Your company name
Address | Phone | Email
License no. ______

ESTIMATE NO. ______    DATE ______    VALID UNTIL ______

PREPARED FOR
Name ______
Address ______
Phone ______    Email ______

SERVICE ADDRESS (if different) ______

EQUIPMENT
Make ______    Model ______    Serial ______    Location ______

SCOPE OF WORK
What the customer asked for: ______
What we found: ______
What we propose: ______

LINE ITEMS (description | qty | rate | amount | taxable Y/N)
Labor                        ___ hrs x ______ = ______    Y / N
Part (part no. ______)       ___ x ______ = ______    Y / N
Equipment                    1 x ______ = ______    Y / N
Permit / disposal fee        1 x ______ = ______    Y / N
Discount                     minus ______

Subtotal ______
Tax (___% on taxable lines) ______
ESTIMATE TOTAL ______
Deposit to start (___%) ______

NOT INCLUDED: ______
THIS PRICE IS VALID FOR ___ DAYS
WARRANTY: labor ______; parts per manufacturer
PERMIT: ______

Accepted by (signature) ______    Date ______

This is an estimate, not a bill. Nothing is owed until the work is approved.
`;

export const BLANK_TEXT_BY_DOC: Record<DocKind, string> = { invoice: BLANK_TEMPLATE_TEXT, estimate: BLANK_ESTIMATE_TEXT };
