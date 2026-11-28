/**
 * The four templates on /resources/templates: their content, once.
 *
 * ============ ONE SOURCE, FOUR FORMATS ============
 * Each template is structured content in this file. The same content becomes
 *   - the printable page on /resources/templates (Print / Save as PDF),
 *   - the editable Excel or Word file (template-files.ts, built at build time),
 *   - a filled-in HVAC example of both, and
 *   - the original plain .csv / .md download at /resources/templates/<id>,
 *     kept so links to it keep working.
 * Review this file and you have reviewed every download.
 *
 * Content is original, with HVAC examples, and deliberately NOT legal advice:
 * the maintenance agreement is an outline of sections an owner should discuss
 * with an attorney, not a contract. Every example business, person, address
 * and price is made up and labelled as a sample.
 *
 * Pure: relative imports only, so the verifier can load it and check that the
 * ids, filenames and the pricing worksheet's arithmetic hold.
 */
import { MAINTENANCE_AGREEMENT_DEFAULTS, calculateMaintenanceAgreement } from "./maintenance-agreement";

export type ResourceTemplateFormat = "csv" | "md";

export type ResourceTemplateFeatureKey = "estimates" | "price-book" | "dispatch" | "invoices";

export type ResourceTemplate = {
  /** URL segment and the only key the legacy route handler accepts. */
  id: string;
  title: string;
  description: string;
  /** The legacy plain-text download. */
  format: ResourceTemplateFormat;
  /** Legacy download filename, including extension. */
  filename: string;
  /** The editable file type offered first. */
  editable: "xlsx" | "docx";
  /** Base name of the editable and example files, no extension. */
  fileBase: string;
  /** What the owner should do with it, one or two sentences. */
  howToUse: string;
  /** Key of the "In Altair Operating System" note shown beside the template. */
  featureKey: ResourceTemplateFeatureKey;
  render: () => string;
};

export const TEMPLATE_CONTENT_TYPES: Record<ResourceTemplateFormat, string> = {
  csv: "text/csv; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

/** The made-up business every example uses. */
export const SAMPLE_BUSINESS = {
  name: "Example Heating & Air (sample)",
  phone: "(555) 555-0100",
  email: "office@example.com",
  license: "HVAC-000000 (sample)",
} as const;

/* ------------------------------------------------------------------ csv */

/** RFC 4180 quoting: wrap when the cell holds a comma, quote or newline. */
export function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  // CRLF line endings are what spreadsheet programs expect from a .csv.
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function money(value: number): string {
  return value.toFixed(2);
}

/* ============================================================ estimate */

export type EstimateLine = {
  section: string;
  item: string;
  description: string;
  qty: number | null;
  unit: string;
  unitPrice: number | null;
};

export type EstimateDoc = {
  /** Left header block: your company. */
  company: readonly { label: string; value: string }[];
  /** Right header block: the estimate's own details. */
  details: readonly { label: string; value: string }[];
  customer: readonly { label: string; value: string }[];
  lines: readonly EstimateLine[];
  discount: number;
  /** Sales tax rate as a fraction, or null to leave for the owner. */
  taxRate: number | null;
  terms: readonly { label: string; text: string }[];
};

const EMPTY_LINE: EstimateLine = { section: "", item: "", description: "", qty: null, unit: "", unitPrice: null };

export const ESTIMATE_BLANK: EstimateDoc = {
  company: [
    { label: "Company", value: "" },
    { label: "Phone", value: "" },
    { label: "Email", value: "" },
    { label: "License #", value: "" },
  ],
  details: [
    { label: "Estimate #", value: "" },
    { label: "Date", value: "" },
    { label: "Valid until", value: "" },
    { label: "Prepared by", value: "" },
  ],
  customer: [
    { label: "Customer", value: "" },
    { label: "Phone", value: "" },
    { label: "Email", value: "" },
    { label: "Service address", value: "" },
    { label: "Equipment on site", value: "" },
  ],
  lines: Array.from({ length: 8 }, () => EMPTY_LINE),
  discount: 0,
  taxRate: null,
  terms: [
    { label: "Scope of work", text: "" },
    { label: "Not included", text: "" },
    { label: "Warranty", text: "" },
    { label: "Payment terms", text: "" },
  ],
};

export const ESTIMATE_EXAMPLE: EstimateDoc = {
  company: [
    { label: "Company", value: SAMPLE_BUSINESS.name },
    { label: "Phone", value: SAMPLE_BUSINESS.phone },
    { label: "Email", value: SAMPLE_BUSINESS.email },
    { label: "License #", value: SAMPLE_BUSINESS.license },
  ],
  details: [
    { label: "Estimate #", value: "EST-0001" },
    { label: "Date", value: "November 21, 2026" },
    { label: "Valid until", value: "December 21, 2026" },
    { label: "Prepared by", value: "Sample Technician" },
  ],
  customer: [
    { label: "Customer", value: "Sample Customer" },
    { label: "Phone", value: "(555) 555-0199" },
    { label: "Email", value: "customer@example.com" },
    { label: "Service address", value: "100 Example Street, Anytown, ST 00000" },
    { label: "Equipment on site", value: "3-ton split system, installed 2012" },
  ],
  lines: [
    { section: "Labor", item: "Diagnostic", description: "On-site diagnostic and system check", qty: 1, unit: "each", unitPrice: 129 },
    { section: "Labor", item: "Repair labor", description: "Remove and replace condenser fan motor", qty: 2, unit: "hour", unitPrice: 125 },
    { section: "Materials", item: "Fan motor", description: "Condenser fan motor matched to the unit nameplate", qty: 1, unit: "each", unitPrice: 185 },
    { section: "Materials", item: "Run capacitor", description: "Run capacitor matched to the motor rating", qty: 1, unit: "each", unitPrice: 28 },
    { section: "Materials", item: "Misc.", description: "Wire, connectors, hardware", qty: 1, unit: "lot", unitPrice: 15 },
  ],
  discount: 0,
  taxRate: null,
  terms: [
    {
      label: "Scope of work",
      text: "Replace the condenser fan motor and run capacitor, check amperage draw and airflow, and verify normal operation before leaving.",
    },
    { label: "Not included", text: "Refrigerant, ductwork and electrical panel work. Quoted separately if needed." },
    { label: "Warranty", text: "Parts carry the manufacturer's warranty. Labor on this repair: 90 days (sample terms, set your own)." },
    { label: "Payment terms", text: "Balance due on completion. Card, check or bank transfer." },
  ],
};

export const ESTIMATE_TERMS_HINTS: Record<string, string> = {
  "Scope of work": "What is included, step by step.",
  "Not included": "Anything the customer might assume is included but is not.",
  Warranty: "Parts and labor warranty terms, in your own words.",
  "Payment terms": "Deposit, when the balance is due, how you accept payment.",
};

export function estimateTotals(doc: EstimateDoc) {
  const subtotal = doc.lines.reduce((sum, line) => sum + (line.qty ?? 0) * (line.unitPrice ?? 0), 0);
  const taxable = subtotal - doc.discount;
  const tax = doc.taxRate === null ? 0 : taxable * doc.taxRate;
  return { subtotal, discount: doc.discount, tax, total: taxable + tax };
}

function renderEstimateTemplate(): string {
  const doc = ESTIMATE_EXAMPLE;
  const totals = estimateTotals(doc);
  return toCsv([
    ["ESTIMATE TEMPLATE"],
    ["Fill in the header, then one row per line item. Replace the example rows. Example business and prices are samples."],
    [],
    ...doc.company.map((row, i) => [row.label, row.value, "", doc.details[i]?.label ?? "", doc.details[i]?.value ?? ""]),
    [],
    ...doc.customer.map((row) => [row.label, row.value]),
    [],
    ["Section", "Item", "Description", "Qty", "Unit", "Unit price", "Line total"],
    ...doc.lines.map((line) => [line.section, line.item, line.description, line.qty ?? "", line.unit, money(line.unitPrice ?? 0), money((line.qty ?? 0) * (line.unitPrice ?? 0))]),
    [],
    ["", "", "", "", "", "Subtotal", money(totals.subtotal)],
    ["", "", "", "", "", "Discount", money(totals.discount)],
    ["", "", "", "", "", "Tax (your local rate)", ""],
    ["", "", "", "", "", "TOTAL", ""],
    [],
    ...doc.terms.map((term) => [term.label, term.text]),
    [],
    ["Customer approval", "Signature", "", "Date", ""],
    [],
    ["This is a template, not a contract. Have your own terms reviewed by an attorney in your state."],
    ["Example prices are placeholders for illustration only; use your own costs and rates."],
  ]);
}

/* =================================================== pricing worksheet */

/**
 * The pricing worksheet's worked example, computed rather than typed, so
 * the numbers in every download add up. Exported for the verifier.
 * Its job is the estimate example's repair: 3 hours, $213 of parts
 * (the $185 fan motor and the $28 capacitor).
 */
export function pricingWorksheetExample() {
  const wage = 30;
  const burden = 0.25;
  const hours = 3;
  const partsCost = 213;
  const markup = 0.4;
  const otherDirect = 0;
  const overheadShare = 0.25;
  const netMargin = 0.15;

  const loadedHourly = wage * (1 + burden);
  const laborCost = loadedHourly * hours;
  const materialsPrice = partsCost * (1 + markup);
  const directCost = laborCost + partsCost + otherDirect;
  const price = directCost / (1 - overheadShare - netMargin);
  const overheadDollars = price * overheadShare;
  const marginDollars = price * netMargin;
  const grossMargin = (price - directCost) / price;
  const effectiveRate = (price - partsCost - otherDirect) / hours;

  return {
    wage,
    burden,
    hours,
    partsCost,
    markup,
    otherDirect,
    overheadShare,
    netMargin,
    loadedHourly,
    laborCost,
    materialsPrice,
    directCost,
    price,
    overheadDollars,
    marginDollars,
    grossMargin,
    effectiveRate,
  };
}

type WorksheetKey = keyof ReturnType<typeof pricingWorksheetExample>;

export type WorksheetRow = {
  step: string;
  line: string;
  key: WorksheetKey;
  unit: "$" | "%" | "hrs";
  /** Inputs are typed by the owner; the rest are worked out from them. */
  input: boolean;
  /** An input that counts as 0 when left empty. */
  optional?: boolean;
  /** For worked-out rows: the formula over other keys, e.g. "{wage}*(1+{burden})". */
  formula?: string;
  /** Shown beside the row. */
  how?: string;
};

export const WORKSHEET_ROWS: readonly WorksheetRow[] = [
  { step: "1. Labor", line: "Technician hourly wage", key: "wage", unit: "$", input: true },
  { step: "1. Labor", line: "Labor burden: payroll taxes, insurance, benefits", key: "burden", unit: "%", input: true, how: "% of wage" },
  { step: "1. Labor", line: "Loaded hourly cost", key: "loadedHourly", unit: "$", input: false, formula: "{wage}*(1+{burden})", how: "wage × (1 + burden)" },
  { step: "1. Labor", line: "Hours on the job, including drive and setup", key: "hours", unit: "hrs", input: true },
  { step: "1. Labor", line: "Labor cost", key: "laborCost", unit: "$", input: false, formula: "{loadedHourly}*{hours}", how: "loaded hourly × hours" },
  { step: "2. Materials", line: "Parts at your cost", key: "partsCost", unit: "$", input: true },
  { step: "2. Materials", line: "Material markup, for reference", key: "markup", unit: "%", input: true, optional: true },
  { step: "2. Materials", line: "Marked-up materials, for reference", key: "materialsPrice", unit: "$", input: false, formula: "{partsCost}*(1+{markup})", how: "parts × (1 + markup)" },
  { step: "3. Other direct", line: "Subcontractor, permits, disposal, rentals", key: "otherDirect", unit: "$", input: true, optional: true, how: "leave empty if none" },
  { step: "4. Overhead and margin", line: "Overhead share of price", key: "overheadShare", unit: "%", input: true, how: "last year's overhead ÷ sales" },
  { step: "4. Overhead and margin", line: "Target net margin", key: "netMargin", unit: "%", input: true, how: "% of price" },
  { step: "5. Price", line: "Total direct cost", key: "directCost", unit: "$", input: false, formula: "{laborCost}+{partsCost}+{otherDirect}", how: "labor + parts + other" },
  { step: "5. Price", line: "Price", key: "price", unit: "$", input: false, formula: "{directCost}/(1-{overheadShare}-{netMargin})", how: "direct ÷ (1 − overhead − margin)" },
  { step: "5. Price", line: "Overhead dollars in the price", key: "overheadDollars", unit: "$", input: false, formula: "{price}*{overheadShare}", how: "price × overhead share" },
  { step: "5. Price", line: "Profit dollars in the price", key: "marginDollars", unit: "$", input: false, formula: "{price}*{netMargin}", how: "price × margin" },
  { step: "6. Checks", line: "Gross margin", key: "grossMargin", unit: "%", input: false, formula: "({price}-{directCost})/{price}", how: "(price − direct) ÷ price" },
  { step: "6. Checks", line: "Effective labor rate", key: "effectiveRate", unit: "$", input: false, formula: "({price}-{partsCost}-{otherDirect})/{hours}", how: "(price − parts − other) ÷ hours" },
];

export const WORKSHEET_NOTES: readonly string[] = [
  "Overhead share and target margin are decisions about your business, not industry constants. Review them with your accountant.",
  "Dividing by (1 − overhead share − margin) expresses both as a share of the final price, which is how they appear on a profit and loss statement.",
  "Compare the effective labor rate with your result from the labor rate calculator at altair-op.com/resources.",
  "Estimates only. Not financial, tax or legal advice. Example values are samples.",
];

function renderPricingWorksheet(): string {
  const ex = pricingWorksheetExample();
  const pct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
  const show = (row: WorksheetRow) => (row.unit === "%" ? pct(ex[row.key]) : row.unit === "hrs" ? String(ex[row.key]) : money(ex[row.key]));
  return toCsv([
    ["PRICING WORKSHEET"],
    ["Build one price from cost up. Fill the Your numbers column; the Example column shows a completed calculation."],
    [],
    ["Step", "Line", "Your numbers", "Example"],
    ...WORKSHEET_ROWS.map((row) => [row.step, row.how ? `${row.line} = ${row.how}` : row.line, "", show(row)]),
    ["5. Price", "Check: direct cost + overhead dollars + margin dollars = price", "", `${money(ex.directCost)} + ${money(ex.overheadDollars)} + ${money(ex.marginDollars)} = ${money(ex.price)}`],
    [],
    ...WORKSHEET_NOTES.map((note) => ["Notes", note]),
  ]);
}

/* ======================================================== agreement */

const AGREEMENT_EX = MAINTENANCE_AGREEMENT_DEFAULTS;
const AGREEMENT_PRICE = calculateMaintenanceAgreement(AGREEMENT_EX)!;
const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export type AgreementSection = {
  title: string;
  /** What this section has to decide. */
  decide: readonly string[];
  /** The filled-in HVAC example's answers. Sample terms only. */
  example: readonly string[];
};

export const AGREEMENT_DISCLAIMER =
  "This is an outline of the sections a residential or light-commercial maintenance agreement usually needs, with notes on what each one should decide. It is not a contract and not legal advice. Laws on auto-renewal, cancellation, consumer notices and warranties differ by state and change over time. Have an attorney licensed in your state review your agreement before you use it.";

export const AGREEMENT_SECTIONS: readonly AgreementSection[] = [
  {
    title: "Parties and property",
    decide: [
      "Legal name of your company, license number and contact details.",
      "Customer name, billing address, and the service address if different.",
      "Equipment covered: type, make, model, serial, location and approximate age of each unit.",
      "Equipment NOT covered, for example window units, pool heaters, or equipment with failures noted at enrollment.",
    ],
    example: [
      `${SAMPLE_BUSINESS.name}, license ${SAMPLE_BUSINESS.license}, ${SAMPLE_BUSINESS.phone}.`,
      "Sample Customer, 100 Example Street, Anytown, ST 00000.",
      "Covered: one 3-ton split-system condenser (2012) and its attic air handler.",
      "Not covered: window units, the pool heater, and the bathroom exhaust fans.",
    ],
  },
  {
    title: "Term, start date and renewal",
    decide: [
      "Start date and length of the term (12 months is common).",
      "Whether the agreement renews automatically. If it does, how the customer is told before renewal and how they can decline. Many states regulate auto-renewal language: ask your attorney.",
      "What happens if covered equipment is replaced mid-term.",
    ],
    example: [
      "Starts on the date signed and runs 12 months.",
      "Renews for another 12 months only if the customer says yes to a reminder sent 30 days before the end.",
      "If covered equipment is replaced during the term, the agreement moves to the new equipment at no charge.",
    ],
  },
  {
    title: "Services included",
    decide: [
      "Number of visits per year and the season of each.",
      "A numbered checklist for each visit type. Vague \"tune-up\" language invites disputes.",
      "Consumables included and excluded (filters, drain treatments, belts).",
      "A written report left with the customer after each visit.",
    ],
    example: [
      "Two visits a year: a cooling visit in spring and a heating visit in fall.",
      "Cooling visit: check refrigerant pressures and temperatures, clean the condenser coil, test the capacitor and contactor, clear the condensate drain, check safety controls, replace a standard 1-inch filter.",
      "Heating visit: inspect the burners and flame sensor, check the heat exchanger visually, test the igniter and safety controls, check gas pressure, replace a standard 1-inch filter.",
      "A visit report with readings and photos is sent after each visit.",
    ],
  },
  {
    title: "Services NOT included",
    decide: [
      "Repairs, parts, refrigerant, duct cleaning, indoor air quality equipment, and work required by code changes.",
      "Damage from neglect, misuse, power surges, flooding, pests, or changes made by others.",
      "Emergency calls outside the included visits (see member benefits).",
    ],
    example: [
      "Repairs, parts and refrigerant are billed separately at the member discount.",
      "Duct cleaning, air quality equipment and code-required upgrades are not included.",
      "Damage from surges, flooding, pests or work by others is not covered.",
    ],
  },
  {
    title: "Member benefits",
    decide: [
      "Priority scheduling, and only a response window you can actually keep.",
      "Any repair discount, as a percentage, and whether it applies to labor, parts or both.",
      "A waived or reduced diagnostic fee, and any extended labor warranty while enrolled.",
    ],
    example: [
      "Members are scheduled ahead of non-member calls on the same day.",
      `${AGREEMENT_EX.repairDiscountRate * 100}% off repair labor and parts.`,
      "No diagnostic fee on a member's repair call during business hours.",
    ],
  },
  {
    title: "Price and payment",
    decide: [
      "Total annual price, and whether it may be paid monthly.",
      "Payment method, due dates, and how late payment is handled.",
      "Whether the price is fixed for the term and how renewals are priced.",
      "Taxes, if applicable in your jurisdiction.",
    ],
    example: [
      `${usd(AGREEMENT_PRICE.annualPrice)} a year, or ${usd(AGREEMENT_PRICE.monthlyPrice)} a month by card on file (the worked example in the maintenance agreement pricing calculator).`,
      "Monthly payments are charged on the 1st. Visits are paused while a payment is more than 30 days late.",
      "The price is fixed for the term. Renewal price is stated in the renewal reminder.",
    ],
  },
  {
    title: "Scheduling and access",
    decide: [
      "Who starts scheduling each season (you, the customer, or both).",
      "What happens if the customer does not respond or misses a visit: does it roll over, expire, or get refunded?",
      "Access requirements: an adult present, pets secured, clear access to equipment.",
    ],
    example: [
      "The office calls or texts to book each visit four weeks before the season.",
      "A visit the customer does not book within the season is lost, not refunded.",
      "An adult over 18 is home, pets are secured, and the attic access is clear.",
    ],
  },
  {
    title: "Cancellation and refunds",
    decide: [
      "How either side cancels and with how much notice.",
      "How a refund is worked out if visits were already done (for example, charging completed visits at the regular price against the amount paid).",
      "Whether the agreement moves to a new owner of the property.",
    ],
    example: [
      "Either side may cancel with 30 days' written notice, by email or letter.",
      "Refund: the amount paid, less completed visits at the regular price and discounts already used.",
      "The agreement moves to a new owner of the home if they ask within 30 days of the sale.",
    ],
  },
  {
    title: "Limitations and liability",
    decide: [
      "Maintenance lowers but does not end the chance of a breakdown; no promise of uninterrupted operation.",
      "Limits on liability and any disclaimer of implied warranties. This wording depends heavily on your state: your attorney writes it.",
      "How conditions found at the first visit are handled.",
    ],
    example: [
      "Maintenance does not guarantee the equipment will not fail.",
      "[Liability wording to be written by our attorney.]",
      "Problems found at the first visit are quoted before any repair; the customer may decline them.",
    ],
  },
  {
    title: "Signatures and records",
    decide: [
      "Signature and date for both sides, including whether electronic signatures are accepted.",
      "Where the agreement, visit reports and invoices are kept, so the office and the technician see the same record.",
    ],
    example: [
      "Signed electronically by the customer and the office manager.",
      "The agreement, every visit report and every invoice are kept on the customer's record in the office software.",
    ],
  },
];

export const AGREEMENT_CHECKLIST: readonly string[] = [
  "An attorney in your state has reviewed the full text.",
  "Auto-renewal and cancellation language follows your state's rules.",
  "Each visit type has a specific, numbered checklist.",
  "Exclusions are listed plainly.",
  "Price, payment timing and refund math are stated.",
  "Your office and technicians have read it and can explain it.",
];

function renderMaintenanceAgreementOutline(): string {
  const sections = AGREEMENT_SECTIONS.map(
    (section, index) => `## ${index + 1}. ${section.title}\n\n${section.decide.map((item) => `- ${item}`).join("\n")}\n`,
  ).join("\n");
  return `# Maintenance Agreement Outline\n\n> ${AGREEMENT_DISCLAIMER.replace("not a contract and not legal advice", "**not** a contract and **not** legal advice")}\n\n${sections}\n---\n\nChecklist before you use your version:\n\n${AGREEMENT_CHECKLIST.map((item) => `- [ ] ${item}`).join("\n")}\n`;
}

/* ========================================================= checklist */

export type ChecklistItem = {
  text: string;
  /** The item that most often slips when the owner also works in the field. */
  owner?: boolean;
  /** The filled-in example's note for this item (a made-up day). */
  example?: string;
};

export type ChecklistSection = { title: string; items: readonly ChecklistItem[] };

export const CHECKLIST_SECTIONS: readonly ChecklistSection[] = [
  {
    title: "Before dispatch",
    items: [
      { text: "Review today's schedule: every job has an address, a contact phone number and a technician assigned.", example: "9 jobs, 3 techs, all assigned 7:10." },
      { text: "Confirm parts for today's jobs are on the truck or ready for pickup. Flag any job that cannot be finished without a part not in hand.", example: "Fan motor for job 4 picked up at the supply house." },
      { text: "Check overnight messages, voicemail and web requests; reply to anyone waiting before the first truck rolls.", example: "2 voicemails, 1 web request. All answered." },
      { text: "Review yesterday's unfinished jobs: rescheduled, waiting on parts, or waiting on the customer?", example: "1 waiting on a part, due Thursday." },
      { text: "Check cash: deposits expected today, bills due this week.", owner: true, example: "Supplier statement due Friday." },
    ],
  },
  {
    title: "Dispatch and morning",
    items: [
      { text: "Send each technician their first stop and confirm they received it.", example: "All 3 confirmed by 7:25." },
      { text: "Give the first customers of the day an arrival window.", example: "Texts sent for 8 to 10 windows." },
      { text: "Review open estimates older than a week; choose today's follow-ups.", example: "Called 2, one approved." },
      { text: "Order parts for approved estimates so the work can be scheduled.", example: "Ordered a condenser coil for next week." },
    ],
  },
  {
    title: "Midday",
    items: [
      { text: "Check job progress; move afternoon jobs if a morning job runs long, and tell affected customers before they call you.", example: "Job 2 ran long; job 6 moved to 3 pm, customer told." },
      { text: "Review new leads and respond promptly.", example: "1 replacement lead booked for Friday." },
      { text: "Record payments collected in the field this morning.", example: "3 card payments recorded." },
    ],
  },
  {
    title: "Close-out",
    items: [
      { text: "Every completed job has notes, photos if your process requires them, and an outcome.", example: "8 of 9 complete; 1 needs a return visit." },
      { text: "Invoices for today's completed work are sent, or you know why not.", example: "8 sent." },
      { text: "Payments received are recorded; anything unpaid has a follow-up date.", example: "2 unpaid, follow up Monday." },
      { text: "Technicians' hours for the day are recorded and look right (no forgotten clock-outs).", example: "Checked; one clock-out fixed." },
      { text: "Tomorrow's schedule is reviewed: unassigned jobs, missing parts, long drives.", example: "10 jobs, all assigned." },
      { text: "Return the last calls and messages of the day.", example: "Done 5:40." },
    ],
  },
  {
    title: "Weekly",
    items: [
      { text: "Review jobs completed but not invoiced, and invoices sent but unpaid." },
      { text: "Review estimates sent but not answered; follow up or close them." },
      { text: "Compare hours paid with hours billed for each technician." },
      { text: "Review maintenance visits due in the next two weeks." },
      { text: "Look at one report you did not look at last week.", owner: true },
    ],
  },
  {
    title: "Monthly",
    items: [
      { text: "Reconcile bank deposits against recorded payments." },
      { text: "Compare actual overhead with the overhead your pricing assumes." },
      { text: "Update prices for any parts whose cost changed." },
      { text: "Review vehicle condition and any safety incidents." },
    ],
  },
];

function renderDailyOperationsChecklist(): string {
  const sections = CHECKLIST_SECTIONS.map(
    (section) => `## ${section.title}\n\n${section.items.map((item) => `- [ ] ${item.owner ? "**(owner)** " : ""}${item.text}`).join("\n")}\n`,
  ).join("\n");
  return `# Daily Operations Checklist\n\nA routine for a small field service office. Adapt the times to your shop;\nkeep the order. Items marked **(owner)** are the ones that most often slip\nwhen the owner is also working in the field.\n\n${sections}\n---\n\nThis is a starting point, not a rule book. Remove what does not apply and\nadd what you keep forgetting.\n`;
}

/* ============================================================ the list */

export const RESOURCE_TEMPLATES: readonly ResourceTemplate[] = [
  {
    id: "estimate-template",
    title: "HVAC estimate template",
    description:
      "A professional estimate with your header, the customer and equipment, line items by section, totals that add themselves up, scope, exclusions, warranty and payment terms.",
    format: "csv",
    filename: "altair-estimate-template.csv",
    editable: "xlsx",
    fileBase: "altair-estimate-template",
    howToUse:
      "Open the Excel file, put your company in the header once, and save a copy per customer. Line totals, subtotal, tax and total calculate as you type.",
    featureKey: "estimates",
    render: renderEstimateTemplate,
  },
  {
    id: "pricing-worksheet",
    title: "Pricing worksheet",
    description:
      "Build one price from cost up: loaded labor, parts, other direct costs, overhead share and target margin. The Excel version works the price out as you type.",
    format: "csv",
    filename: "altair-pricing-worksheet.csv",
    editable: "xlsx",
    fileBase: "altair-pricing-worksheet",
    howToUse:
      "Fill the yellow cells for a job you price often and compare the price with what you charge today. Check the effective labor rate against the labor rate calculator.",
    featureKey: "price-book",
    render: renderPricingWorksheet,
  },
  {
    id: "maintenance-agreement-outline",
    title: "Maintenance agreement outline",
    description:
      "The ten sections a service agreement usually needs, with what each one has to decide. The example is filled in for a two-visit HVAC plan. An outline for your attorney, not a contract.",
    format: "md",
    filename: "altair-maintenance-agreement-outline.md",
    editable: "docx",
    fileBase: "altair-maintenance-agreement-outline",
    howToUse:
      "Work through each section with your office and write your answers on the lines, then have an attorney licensed in your state turn them into your agreement.",
    featureKey: "invoices",
    render: renderMaintenanceAgreementOutline,
  },
  {
    id: "daily-operations-checklist",
    title: "Daily operations checklist",
    description:
      "Before-dispatch, midday and close-out routines for a small service office, plus short weekly and monthly reviews. The example shows one made-up day at a three-truck shop.",
    format: "md",
    filename: "altair-daily-operations-checklist.md",
    editable: "docx",
    fileBase: "altair-daily-operations-checklist",
    howToUse:
      "Print a copy a day or keep it open at the dispatch desk. Remove what does not apply to your shop and add what you keep forgetting.",
    featureKey: "dispatch",
    render: renderDailyOperationsChecklist,
  },
];

/** The editable file's download name: "altair-estimate-template.xlsx", "...-example.xlsx". */
export function templateFileName(template: ResourceTemplate, variant: "blank" | "example"): string {
  return `${template.fileBase}${variant === "example" ? "-example" : ""}.${template.editable}`;
}

/** Where the editable file is served (app/(marketing)/resources/templates/download/[file]). */
export function templateFilePath(name: string): string {
  return `/resources/templates/download/${name}`;
}

export function findResourceTemplate(id: string): ResourceTemplate | null {
  return RESOURCE_TEMPLATES.find((template) => template.id === id) ?? null;
}
