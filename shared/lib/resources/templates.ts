/**
 * Downloadable templates for /resources/templates.
 *
 * ============ GENERATED, NOT STORED ============
 * Every template is a TypeScript constant rendered to text on request by
 * `app/(marketing)/resources/templates/[id]/route.ts`. There are no binary
 * files in the repository to drift out of date, and the content below is the
 * entire content a visitor receives: review this file and you have reviewed
 * the download.
 *
 * Content is original, trade-neutral with HVAC examples, and deliberately
 * NOT legal advice: the maintenance agreement is an outline of sections an
 * owner should discuss with an attorney, not a contract.
 *
 * Pure (no imports) so the verifier can load it and check that every id,
 * filename and content type is well formed and that the worked example in
 * the pricing worksheet adds up.
 */

export type ResourceTemplateFormat = "csv" | "md";

export type ResourceTemplateFeatureKey =
  | "estimates"
  | "price-book"
  | "dispatch"
  | "invoices";

export type ResourceTemplate = {
  /** URL segment and the only key the route handler accepts. */
  id: string;
  title: string;
  description: string;
  format: ResourceTemplateFormat;
  /** Download filename, including extension. */
  filename: string;
  /** What the owner should do with it, one or two sentences. */
  howToUse: string;
  /** Key of the "In Altair OS" note shown beside the template. */
  featureKey: ResourceTemplateFeatureKey;
  render: () => string;
};

export const TEMPLATE_CONTENT_TYPES: Record<ResourceTemplateFormat, string> = {
  csv: "text/csv; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

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

function renderEstimateTemplate(): string {
  return toCsv([
    ["ESTIMATE TEMPLATE"],
    ["Fill in the header, then one row per line item. Replace the example rows."],
    [],
    ["Company name", "Your Company LLC", "", "Estimate #", "EST-0001"],
    ["Company phone", "(555) 555-0100", "", "Date", ""],
    ["Company email", "office@example.com", "", "Valid until", ""],
    ["License #", "", "", "Prepared by", ""],
    [],
    ["Customer name", "", "", "Service address", ""],
    ["Customer phone", "", "", "City / State / ZIP", ""],
    ["Customer email", "", "", "Equipment on site", "e.g. 3-ton split system, installed 2012"],
    [],
    ["Section", "Item", "Description", "Qty", "Unit", "Unit price", "Line total"],
    ["Labor", "Diagnostic", "On-site diagnostic and system check", 1, "each", "129.00", "129.00"],
    ["Labor", "Repair labor", "Remove and replace condenser fan motor", 2, "hour", "125.00", "250.00"],
    ["Materials", "Fan motor", "Condenser fan motor matched to the unit nameplate", 1, "each", "185.00", "185.00"],
    ["Materials", "Run capacitor", "Run capacitor matched to the motor rating", 1, "each", "28.00", "28.00"],
    ["Materials", "Misc.", "Wire, connectors, hardware", 1, "lot", "15.00", "15.00"],
    ["Other", "Permit / disposal", "If required by your jurisdiction", 0, "each", "0.00", "0.00"],
    [],
    ["", "", "", "", "", "Subtotal", "607.00"],
    ["", "", "", "", "", "Discount", "0.00"],
    ["", "", "", "", "", "Tax (your local rate)", ""],
    ["", "", "", "", "", "TOTAL", ""],
    [],
    ["Scope of work", "Describe what is included. Example: replace condenser fan motor and run capacitor, check amperage draw and airflow, verify normal operation."],
    ["Exclusions", "List anything the customer might assume is included but is not. Example: refrigerant, ductwork, electrical panel work."],
    ["Warranty", "State parts and labor warranty terms separately, in your own words."],
    ["Payment terms", "Example: deposit to schedule, balance due on completion. List accepted payment methods."],
    ["Notes", "Access, pets, scheduling constraints, anything the technician needs to know."],
    [],
    ["Customer approval", "Signature", "", "Date", ""],
    [],
    ["This is a template, not a contract. Have your own terms reviewed by an attorney in your state."],
    ["Example prices are placeholders for illustration only; use your own costs and rates."],
  ]);
}

function renderMaintenanceAgreementOutline(): string {
  return `# Maintenance Agreement Outline

> This is an outline of the sections a residential or light-commercial
> maintenance agreement usually needs, with notes on what each one should
> decide. It is **not** a contract and **not** legal advice. Laws on
> auto-renewal, cancellation, consumer notices and warranties differ by
> state and change over time. **Have an attorney licensed in your state
> review your agreement before you use it.**

## 1. Parties and property

- Legal name of your company, license number, contact details.
- Customer name, billing address, and the service address if different.
- Equipment covered: type, make, model, serial, location and approximate
  age for each unit. Example: "3-ton split-system condenser (2015), attic
  air handler."
- Equipment explicitly NOT covered (for example window units, fireplaces,
  pool heaters, or equipment with failures noted at enrollment).

## 2. Term, start date and renewal

- Start date and length of the term (12 months is common).
- Whether the agreement renews automatically. If it does, state how the
  customer is notified before renewal and how they can decline. Many states
  regulate auto-renewal language; this is a question for your attorney.
- What happens if covered equipment is replaced mid-term.

## 3. Services included

- Number of visits per year and the season each is performed in
  (for example one cooling visit in spring, one heating visit in fall).
- A specific checklist for each visit type. Vague "tune-up" language invites
  disputes; a numbered list avoids them. Example cooling items: check
  refrigerant pressures and temperatures, clean the condenser coil, inspect
  the capacitor and contactor, test safety controls, clear the condensate
  drain, replace a standard filter.
- Consumables included and excluded (filters, drain treatments, belts).
- A written report left with the customer after each visit.

## 4. Services NOT included

- Repairs, parts, refrigerant, duct cleaning, indoor air quality
  equipment, and work required by code changes.
- Damage from neglect, misuse, power surges, flooding, pests, or
  modifications by others.
- Emergency calls outside the included visits (see member benefits).

## 5. Member benefits (optional)

- Priority scheduling and the response window you can actually keep.
- Any discount on repairs, stated as a percentage, and whether it applies
  to labor, parts, or both.
- Waived or reduced diagnostic fee.
- Any extended labor warranty on repairs performed while enrolled.

## 6. Price and payment

- Total annual price, and whether it may be paid monthly.
- Payment method, due dates, and how late payment is handled.
- Whether the price is fixed for the term and how renewals are priced.
- Taxes, if applicable in your jurisdiction.

## 7. Scheduling and access

- Who initiates scheduling each season (you, the customer, or both).
- What happens if the customer does not respond or misses a visit: does
  the visit roll over, expire at the end of the term, or get refunded?
- Access requirements (adult present, pets secured, clear access to
  equipment).

## 8. Cancellation and refunds

- How either party cancels and with how much notice.
- How a refund is calculated if visits were already performed (for
  example, charging completed visits at the regular rate against the
  amount paid).
- Whether the agreement transfers to a new owner of the property.

## 9. Limitations and liability

- Maintenance reduces but does not eliminate breakdowns; no promise of
  uninterrupted operation.
- Limits on liability and any disclaimer of implied warranties. Wording
  here is heavily state-dependent and must be reviewed by your attorney.
- How conditions found at the first visit are handled.

## 10. Signatures and records

- Signature and date for both parties, including whether electronic
  signatures are accepted.
- Where the agreement, visit reports and invoices are kept so the office
  and the technician see the same record.

---

Checklist before you use your version:

- [ ] An attorney in your state has reviewed the full text.
- [ ] Auto-renewal and cancellation language follows your state's rules.
- [ ] Each visit type has a specific, numbered checklist.
- [ ] Exclusions are listed plainly.
- [ ] Price, payment timing and refund math are stated.
- [ ] Your office and technicians have read it and can explain it.
`;
}

/**
 * The pricing worksheet's worked example, computed rather than typed, so
 * the numbers in the download always add up. Exported for the verifier.
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

function renderPricingWorksheet(): string {
  const ex = pricingWorksheetExample();
  const pct = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
  return toCsv([
    ["PRICING WORKSHEET"],
    ["Build one price from cost up. Fill the Your numbers column; the Example column shows a completed calculation."],
    [],
    ["Step", "Line", "Your numbers", "Example"],
    ["1. Labor", "Technician hourly wage ($)", "", money(ex.wage)],
    ["1. Labor", "Labor burden: payroll taxes, insurance, benefits (% of wage)", "", pct(ex.burden)],
    ["1. Labor", "Loaded hourly cost = wage x (1 + burden)", "", money(ex.loadedHourly)],
    ["1. Labor", "Hours on the job, including drive and setup", "", ex.hours],
    ["1. Labor", "Labor cost = loaded hourly cost x hours", "", money(ex.laborCost)],
    [],
    ["2. Materials", "Parts at your cost ($)", "", money(ex.partsCost)],
    ["2. Materials", "For reference: parts cost with a material markup", "", ""],
    ["2. Materials", "Material markup (%)", "", pct(ex.markup)],
    ["2. Materials", "Marked-up materials = parts cost x (1 + markup)", "", money(ex.materialsPrice)],
    [],
    ["3. Other direct costs", "Subcontractor, permits, disposal, rentals ($)", "", money(ex.otherDirect)],
    [],
    ["4. Overhead and margin", "Overhead share of price (annual overhead / annual sales)", "", pct(ex.overheadShare)],
    ["4. Overhead and margin", "Target net margin (% of price)", "", pct(ex.netMargin)],
    [],
    ["5. Price", "Total direct cost = labor cost + parts at cost + other direct costs", "", money(ex.directCost)],
    ["5. Price", "Price = total direct cost / (1 - overhead share - net margin)", "", money(ex.price)],
    ["5. Price", "Check: direct cost + overhead dollars + margin dollars = price", "", `${money(ex.directCost)} + ${money(ex.overheadDollars)} + ${money(ex.marginDollars)} = ${money(ex.price)}`],
    [],
    ["6. Sanity checks", "Gross margin = (price - direct cost) / price", "", pct(ex.grossMargin)],
    ["6. Sanity checks", "Effective labor rate = (price - parts - other direct) / hours", "", money(ex.effectiveRate)],
    ["6. Sanity checks", "Compare with your result from the labor-rate calculator", "", "altair-op.com/resources/calculators/labor-rate"],
    [],
    ["Notes", "Overhead share and target margin are decisions about your business, not industry constants. Review them with your accountant."],
    ["Notes", "Dividing by (1 - overhead share - margin) expresses both as a share of the final price, which is how they appear on a profit and loss statement."],
    ["Notes", "If you price materials with a markup instead, check the result against this method so the job still covers overhead and margin."],
    ["Notes", "Estimates only. Not financial, tax or legal advice."],
  ]);
}

function renderDailyOperationsChecklist(): string {
  return `# Daily Operations Checklist

A routine for a small field service office. Adapt the times to your shop;
keep the order. Items marked **(owner)** are the ones that most often slip
when the owner is also working in the field.

## Before dispatch

- [ ] Review today's schedule: every job has an address, a contact phone
      number, and a technician assigned.
- [ ] Confirm parts for today's jobs are on the truck or ready for pickup.
      Flag any job that cannot be finished without a part not in hand.
- [ ] Check overnight messages, voicemail and web requests; reply to
      anyone waiting before the first truck rolls.
- [ ] Review yesterday's unfinished jobs; decide whether each is
      rescheduled, waiting on parts, or waiting on the customer.
- [ ] **(owner)** Check cash: deposits expected today, bills due this week.

## Dispatch and morning

- [ ] Send each technician their first stop and confirm they received it.
- [ ] Give the first customers of the day an arrival window.
- [ ] Review open estimates older than a week; choose today's follow-ups.
- [ ] Order parts for approved estimates so the work can be scheduled.

## Midday

- [ ] Check job progress; move afternoon jobs if a morning job runs long,
      and tell affected customers before they call you.
- [ ] Review new leads and respond promptly.
- [ ] Record payments collected in the field this morning.

## Close-out

- [ ] Every completed job has notes, photos if your process requires
      them, and an outcome (completed, needs return visit, needs estimate).
- [ ] Invoices for today's completed work are sent, or you know why not.
- [ ] Payments received are recorded; anything unpaid has a follow-up date.
- [ ] Technicians' hours for the day are recorded and look right (no
      forgotten clock-outs).
- [ ] Tomorrow's schedule is reviewed: unassigned jobs, missing parts,
      long drives.
- [ ] Return the last calls and messages of the day.

## Weekly

- [ ] Review jobs completed but not invoiced, and invoices sent but unpaid.
- [ ] Review estimates sent but not answered; follow up or close them.
- [ ] Compare hours paid with hours billed for each technician.
- [ ] Review maintenance visits due in the next two weeks.
- [ ] **(owner)** Look at one report you did not look at last week.

## Monthly

- [ ] Reconcile bank deposits against recorded payments.
- [ ] Compare actual overhead with the overhead your pricing assumes.
- [ ] Update prices for any parts whose cost changed.
- [ ] Review vehicle condition and any safety incidents.

---

This is a starting point, not a rule book. Remove what does not apply and
add what you keep forgetting.
`;
}

export const RESOURCE_TEMPLATES: readonly ResourceTemplate[] = [
  {
    id: "estimate-template",
    title: "Estimate template",
    description:
      "A spreadsheet-ready estimate with header, line items by section, totals, scope, exclusions, warranty and payment terms. Example rows show a condenser fan motor replacement.",
    format: "csv",
    filename: "altair-estimate-template.csv",
    howToUse:
      "Open it in any spreadsheet program, replace the example rows with your own items and prices, and save a copy per customer. Add tax at your local rate.",
    featureKey: "estimates",
    render: renderEstimateTemplate,
  },
  {
    id: "maintenance-agreement-outline",
    title: "Maintenance agreement outline",
    description:
      "The ten sections a service agreement usually needs, with notes on what each should decide. An outline to take to your attorney, not a contract.",
    format: "md",
    filename: "altair-maintenance-agreement-outline.md",
    howToUse:
      "Work through each section with your office and write down your answers, then have an attorney licensed in your state turn them into your agreement.",
    featureKey: "invoices",
    render: renderMaintenanceAgreementOutline,
  },
  {
    id: "pricing-worksheet",
    title: "Pricing worksheet",
    description:
      "Build one price from cost up: loaded labor, parts, other direct costs, overhead share and target margin, with a worked example that adds up.",
    format: "csv",
    filename: "altair-pricing-worksheet.csv",
    howToUse:
      "Fill in your numbers for a job you price often and compare the result with what you charge today. Check the hourly figure against the labor-rate calculator.",
    featureKey: "price-book",
    render: renderPricingWorksheet,
  },
  {
    id: "daily-operations-checklist",
    title: "Daily operations checklist",
    description:
      "Before-dispatch, midday and close-out routines for a small service office, plus short weekly and monthly reviews.",
    format: "md",
    filename: "altair-daily-operations-checklist.md",
    howToUse:
      "Print it or keep it open at the dispatch desk. Remove what does not apply to your shop and add what you keep forgetting.",
    featureKey: "dispatch",
    render: renderDailyOperationsChecklist,
  },
];

export function findResourceTemplate(id: string): ResourceTemplate | null {
  return RESOURCE_TEMPLATES.find((template) => template.id === id) ?? null;
}
