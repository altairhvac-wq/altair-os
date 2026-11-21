import type { DiscountMode, InvoiceLine } from "@/shared/lib/resources/invoice-builder";

/**
 * The Invoice Builder's editable state, the sample invoice and the blank
 * template text. Every name, address, number and price in the sample is
 * made up and labelled as sample data on the page.
 */

export const TEXT_KEYS = [
  "number",
  "date",
  "dueDate",
  "terms",
  "poNumber",
  "companyName",
  "companyAddress",
  "companyPhone",
  "companyEmail",
  "companyLicense",
  "customerName",
  "customerAddress",
  "customerPhone",
  "customerEmail",
  "serviceAddress",
  "equipmentType",
  "make",
  "model",
  "serial",
  "location",
  "refrigerantType",
  "lbsAdded",
  "lbsRecovered",
  "complaint",
  "cause",
  "correction",
  "taxRate",
  "discount",
  "amountPaid",
  "depositPct",
  "paymentInstructions",
  "warranty",
  "permit",
  "inspection",
  "technician",
  "notes",
] as const;

export type TextKey = (typeof TEXT_KEYS)[number];

export const COMPANY_KEYS = [
  "companyName",
  "companyAddress",
  "companyPhone",
  "companyEmail",
  "companyLicense",
] as const satisfies readonly TextKey[];

export type InvoiceKind = "standard" | "deposit" | "progress";

export type InvoiceState = Record<TextKey, string> & {
  kind: InvoiceKind;
  discountMode: DiscountMode;
  discountReducesTax: boolean;
  lines: InvoiceLine[];
};

const EMPTY_TEXT = Object.fromEntries(TEXT_KEYS.map((key) => [key, ""])) as Record<TextKey, string>;

export const BLANK_INVOICE: InvoiceState = {
  ...EMPTY_TEXT,
  terms: "Due on receipt",
  kind: "standard",
  discountMode: "amount",
  discountReducesTax: false,
  lines: [
    { id: "l1", kind: "labor", description: "", partNumber: "", qty: "", price: "", taxable: false },
    { id: "l2", kind: "part", description: "", partNumber: "", qty: "1", price: "", taxable: true },
  ],
};

/** The filled-in service call from the guide below. All sample data. */
export const SAMPLE_INVOICE: InvoiceState = {
  ...EMPTY_TEXT,
  number: "1042",
  date: "2026-03-03",
  dueDate: "2026-03-03",
  terms: "Due on receipt",
  companyName: "Example Heating & Cooling Co.",
  companyAddress: "100 Sample Way, Anytown, ST 00000",
  companyPhone: "(555) 010-0100",
  companyEmail: "office@example.com",
  companyLicense: "EX-00000",
  customerName: "Pat Sample",
  customerAddress: "200 Example Street, Anytown, ST 00000",
  customerPhone: "(555) 010-0199",
  customerEmail: "pat@example.com",
  serviceAddress: "",
  equipmentType: "Split-system air conditioner, outdoor unit",
  make: "Sample Brand",
  model: "AC-36-SAMPLE",
  serial: "SN-0000-0000",
  location: "Side yard",
  refrigerantType: "R-410A",
  lbsAdded: "2",
  lbsRecovered: "",
  complaint: "House not cooling. Outdoor fan running but compressor not starting.",
  cause: "Failed dual run capacitor; system charge slightly low.",
  correction:
    "Replaced capacitor, added 2 lb R-410A, confirmed compressor start and normal operation. Recommended a leak search, quoted separately.",
  taxRate: "7",
  discount: "10",
  amountPaid: "0",
  depositPct: "50",
  paymentInstructions:
    "Pay by the payment link in the email, by card on site, or by check payable to Example Heating & Cooling Co.",
  warranty: "1 year on labor for this repair; capacitor per manufacturer.",
  permit: "",
  inspection: "",
  technician: "J. Sample",
  notes: "Maintenance member discount applied to the service call.",
  kind: "standard",
  discountMode: "amount",
  discountReducesTax: false,
  lines: [
    { id: "l1", kind: "fee", description: "Diagnostic service call", partNumber: "", qty: "1", price: "119", taxable: false },
    { id: "l2", kind: "labor", description: "Labor, replace run capacitor", partNumber: "", qty: "0.5", price: "121", taxable: false },
    { id: "l3", kind: "part", description: "Dual run capacitor 45/5 MFD 440V", partNumber: "CAP-4554", qty: "1", price: "36", taxable: true },
    { id: "l4", kind: "refrigerant", description: "Refrigerant R-410A", partNumber: "", qty: "2", price: "85", taxable: true },
  ],
};

export const LINE_KIND_LABEL: Record<InvoiceLine["kind"], string> = {
  labor: "Labor",
  part: "Part",
  refrigerant: "Refrigerant",
  fee: "Fee",
};

export const QTY_UNIT: Record<InvoiceLine["kind"], string> = {
  labor: "hrs",
  part: "qty",
  refrigerant: "lb",
  fee: "qty",
};

export const STORAGE_KEY_COMPANY = "altair-tool:invoice-builder:company:v1";

/** The plain-text template the "Copy blank template" button puts on the clipboard. */
export const BLANK_TEMPLATE_TEXT = `HVAC INVOICE

Your company name
Address | Phone | Email
License no. ______

INVOICE NO. ______    INVOICE DATE ______    DUE DATE ______

BILL TO
Name ______
Billing address ______
Phone ______    Email ______

SERVICE ADDRESS (if different) ______

EQUIPMENT SERVICED
Make ______    Model ______    Serial ______    Location ______
Refrigerant type ______    Added ______ lb    Recovered ______ lb

WORK PERFORMED
Complaint: ______
Cause: ______
Correction: ______

LINE ITEMS (description | qty | rate | amount | taxable Y/N)
Diagnostic / service call    1 x ______ = ______    Y / N
Labor                        ___ hrs x ______ = ______    Y / N
Part (part no. ______)       ___ x ______ = ______    Y / N
Refrigerant                  ___ lb x ______ = ______    Y / N
Permit / disposal fee        1 x ______ = ______    Y / N
Discount                     minus ______

Subtotal ______
Tax (___% on taxable lines) ______
Total ______
Paid / deposit ______
BALANCE DUE ______

PERMIT NO. ______    INSPECTION ______
HOW TO PAY: payment link ______, check payable to ______, card, ACH
TERMS: due in ___ days
WARRANTY: labor ______; parts per manufacturer
Technician ______    Customer signature ______

Thank you for your business.
`;
