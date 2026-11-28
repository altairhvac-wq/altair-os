/**
 * Altair records turned into QuickBooks Online request bodies.
 *
 * ============================== THE RULES THAT TRIP REAL SYNCS ==============================
 * Each one is enforced here, where it can be tested without a network:
 *
 *   - A customer's DisplayName must be unique across customers, vendors and
 *     employees, at most 500 characters, with no colon, tab or newline.
 *     An item's Name: unique, at most 100.
 *   - An invoice number goes in DocNumber only when the company lets apps set
 *     numbers (custom transaction numbers) and it fits in 21 characters.
 *     Sending one otherwise "can lead to unwanted duplicates" (Intuit).
 *   - A line's Amount must equal Qty x UnitPrice. If Altair's line total does
 *     not (a rounded line), the line is sent as one unit at the line total, so
 *     the money is right and QuickBooks does not refuse it.
 *   - Sales tax: each line says TAX or NON. The job site goes in ShipAddr,
 *     because QuickBooks' Automated Sales Tax uses it as the destination.
 *     Altair's own tax total goes in TxnTaxDetail.TotalTax; whether QuickBooks
 *     keeps it is checked after the write (engine.ts), never assumed.
 *   - Payments land in Undeposited Funds unless the owner picked an account,
 *     so a card payout can be matched to one bank deposit and income is not
 *     counted twice.
 *
 * Pure apart from node:crypto for the fingerprint. Server and verifier only.
 */
import { createHash } from "node:crypto";
import type {
  ConnectionSettings,
  LocalAddress,
  LocalCustomer,
  LocalInvoice,
  LocalItem,
  LocalPayment,
} from "@/lib/accounting/types";

export const QBO_DISPLAY_NAME_MAX = 500;
export const QBO_ITEM_NAME_MAX = 100;
export const QBO_DOC_NUMBER_MAX = 21;
export const QBO_PAYMENT_REF_MAX = 21;
export const QBO_REQUEST_ID_MAX = 50;
const QBO_DESCRIPTION_MAX = 4000;
const QBO_MEMO_MAX = 1000;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** QuickBooks refuses ":" (it means sub-customer), tabs and newlines in names. */
export function cleanQboName(raw: string, max: number): string {
  const cleaned = raw
    .replace(/[:\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, max).trim();
}

export function customerDisplayName(customer: LocalCustomer): string {
  const name = cleanQboName(customer.name, QBO_DISPLAY_NAME_MAX);
  if (name) return name;
  const company = cleanQboName(customer.companyName ?? "", QBO_DISPLAY_NAME_MAX);
  return company || `Customer ${customer.id.slice(0, 8)}`;
}

/**
 * Names to try, in order, when QuickBooks says the plain name is taken (by a
 * vendor or employee, since an existing customer would have been found and
 * linked first). The city keeps it readable; the short id makes it unique.
 */
export function alternateCustomerDisplayNames(customer: LocalCustomer): string[] {
  const base = customerDisplayName(customer);
  const city = cleanQboName(customer.address.city, 60);
  const options: string[] = [];
  if (city) options.push(`${base} (${city})`);
  options.push(`${base} (Altair ${customer.id.slice(0, 6)})`);
  return options.map((name) => fitWithSuffix(name, QBO_DISPLAY_NAME_MAX));
}

export function itemName(item: LocalItem): string {
  return cleanQboName(item.name, QBO_ITEM_NAME_MAX) || `Item ${item.id.slice(0, 8)}`;
}

export function alternateItemNames(item: LocalItem): string[] {
  return [fitWithSuffix(`${itemName(item)} (Altair ${item.id.slice(0, 6)})`, QBO_ITEM_NAME_MAX)];
}

function fitWithSuffix(name: string, max: number): string {
  if (name.length <= max) return name;
  const open = name.lastIndexOf(" (");
  if (open <= 0) return name.slice(0, max);
  const suffix = name.slice(open);
  return `${name.slice(0, Math.max(1, max - suffix.length)).trim()}${suffix}`;
}

function address(value: LocalAddress | null): Record<string, string> | undefined {
  if (!value) return undefined;
  const out: Record<string, string> = {};
  if (value.line1.trim()) out.Line1 = value.line1.trim().slice(0, 500);
  if (value.line2.trim()) out.Line2 = value.line2.trim().slice(0, 500);
  if (value.city.trim()) out.City = value.city.trim().slice(0, 255);
  if (value.state.trim()) out.CountrySubDivisionCode = value.state.trim().slice(0, 255);
  if (value.postalCode.trim()) out.PostalCode = value.postalCode.trim().slice(0, 30);
  return Object.keys(out).length > 0 ? out : undefined;
}

function hasAddress(value: LocalAddress | null): value is LocalAddress {
  return !!value && [value.line1, value.city, value.postalCode].some((part) => part.trim());
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function buildCustomerBody(customer: LocalCustomer, displayName: string): Record<string, unknown> {
  const body: Record<string, unknown> = { DisplayName: displayName };
  const company = customer.companyName?.trim();
  if (company) body.CompanyName = company.slice(0, 100);
  if (isEmail(customer.email)) body.PrimaryEmailAddr = { Address: customer.email.trim().slice(0, 100) };
  if (customer.phone.trim()) body.PrimaryPhone = { FreeFormNumber: customer.phone.trim().slice(0, 30) };
  const bill = address(customer.address);
  if (bill) body.BillAddr = bill;
  return body;
}

export function buildItemBody(
  item: LocalItem,
  name: string,
  settings: Pick<ConnectionSettings, "incomeAccountRef">,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    Name: name,
    Type: "Service",
    IncomeAccountRef: { value: settings.incomeAccountRef },
    UnitPrice: roundMoney(item.unitPrice),
    Taxable: item.taxable,
  };
  if (item.description?.trim()) body.Description = item.description.trim().slice(0, QBO_DESCRIPTION_MAX);
  return body;
}

export type InvoiceRefs = {
  readonly customerRef: string;
  /** One QuickBooks item id per invoice line, in line order. */
  readonly lineItemRefs: readonly string[];
};

export function buildInvoiceBody(
  invoice: LocalInvoice,
  customer: LocalCustomer,
  refs: InvoiceRefs,
  settings: ConnectionSettings,
): Record<string, unknown> {
  const taxed = settings.taxMode !== "none";

  const lines = invoice.lines.map((line, index) => {
    const lineTotal = roundMoney(line.lineTotal);
    const qty = line.quantity;
    const unit = roundMoney(line.unitPrice);
    // QuickBooks requires Amount = Qty x UnitPrice. A rounded line keeps the
    // money right by going as one unit at the line total.
    const consistent = qty > 0 && Math.abs(roundMoney(qty * unit) - lineTotal) < 0.005;
    const detail: Record<string, unknown> = {
      ItemRef: { value: refs.lineItemRefs[index] },
      Qty: consistent ? qty : 1,
      UnitPrice: consistent ? unit : lineTotal,
    };
    if (taxed) detail.TaxCodeRef = { value: line.taxable ? "TAX" : "NON" };
    const describedQty = consistent ? "" : ` (${qty} x ${unit.toFixed(2)})`;
    return {
      DetailType: "SalesItemLineDetail",
      Amount: lineTotal,
      Description: `${(line.description?.trim() || line.name).slice(0, QBO_DESCRIPTION_MAX - 40)}${describedQty}`,
      SalesItemLineDetail: detail,
    };
  });

  const body: Record<string, unknown> = {
    CustomerRef: { value: refs.customerRef },
    TxnDate: invoice.issueDate,
    DueDate: invoice.dueDate,
    Line: lines,
    PrivateNote: `Sent from Altair: invoice ${invoice.number}`.slice(0, 4000),
  };

  if (settings.customDocNumbers && invoice.number.length <= QBO_DOC_NUMBER_MAX) {
    body.DocNumber = invoice.number;
  }
  const bill = address(customer.address);
  if (bill) body.BillAddr = bill;
  // The job site is where sales tax is owed. QuickBooks falls back to the
  // company's own address when ShipAddr is missing, which is wrong for a
  // service call, so the customer's address stands in when the job has none.
  const site = hasAddress(invoice.serviceAddress) ? invoice.serviceAddress : customer.address;
  const ship = address(site);
  if (ship) body.ShipAddr = ship;
  if (isEmail(customer.email)) body.BillEmail = { Address: customer.email.trim().slice(0, 100) };
  if (invoice.notes?.trim()) body.CustomerMemo = { value: invoice.notes.trim().slice(0, QBO_MEMO_MAX) };

  if (settings.taxMode === "automated" && invoice.taxAmount > 0) {
    body.TxnTaxDetail = { TotalTax: roundMoney(invoice.taxAmount) };
  } else if (settings.taxMode === "manual" && settings.manualTaxCodeRef) {
    body.TxnTaxDetail = {
      TxnTaxCodeRef: { value: settings.manualTaxCodeRef },
      TotalTax: roundMoney(invoice.taxAmount),
    };
  }
  return body;
}

export function buildPaymentBody(
  payment: LocalPayment,
  refs: { customerRef: string; invoiceRemoteId: string; invoiceNumber: string },
  settings: Pick<ConnectionSettings, "depositAccountRef">,
): Record<string, unknown> {
  const amount = roundMoney(payment.amount);
  const body: Record<string, unknown> = {
    CustomerRef: { value: refs.customerRef },
    TotalAmt: amount,
    TxnDate: payment.paymentDate,
    PrivateNote: `Sent from Altair: ${payment.method.replace("_", " ")} payment on invoice ${refs.invoiceNumber}`.slice(0, 4000),
    Line: [
      {
        Amount: amount,
        LinkedTxn: [{ TxnId: refs.invoiceRemoteId, TxnType: "Invoice" }],
      },
    ],
  };
  const reference = payment.reference?.trim();
  if (reference) body.PaymentRefNum = reference.slice(0, QBO_PAYMENT_REF_MAX);
  if (settings.depositAccountRef) body.DepositToAccountRef = { value: settings.depositAccountRef };
  return body;
}

/** A stable hash of a request body: same content, same hash, key order aside. */
export function fingerprintBody(body: Record<string, unknown>): string {
  return createHash("sha256").update(stableJson(body)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * QuickBooks' idempotency key (?requestid=, at most 50 characters, unique per
 * company). The same record with the same content gives the same key, so a
 * write retried after a lost answer is answered from QuickBooks' memory
 * instead of being made twice. A changed record gives a new key.
 */
export function requestIdFor(recordId: string, fingerprint: string, purpose = ""): string {
  const base = recordId.replace(/-/g, "");
  const tail = createHash("sha256").update(`${purpose}:${fingerprint}`).digest("hex");
  return `${base}${tail}`.slice(0, QBO_REQUEST_ID_MAX);
}
