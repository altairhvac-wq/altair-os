/**
 * The accounting sync's vocabulary: what Altair sends, what it remembers about
 * each record, and the two seams the engine is handed.
 *
 * ============================== WHY TWO SEAMS ==============================
 * The engine (./engine.ts) decides WHAT to send and in what order. It never
 * touches the database or the network itself:
 *
 *   SyncStore  reads Altair records and remembers what was sent
 *              (./store.ts against Supabase; an in-memory one in the verifier).
 *   QboApi     talks to one QuickBooks company
 *              (./quickbooks/http-api.ts against Intuit; a practice
 *              QuickBooks in scripts/verify-quickbooks.mjs).
 *
 * So every rule in the engine runs in the verifier exactly as it runs in
 * production, against a QuickBooks that enforces the rules that trip real
 * syncs (duplicate names, stale SyncTokens, its own sales tax).
 *
 * Pure (type-only). Safe to import anywhere.
 */

export type AccountingEntityType = "customer" | "item" | "invoice" | "payment";

/** Order the engine sends in: a record is only sent after what it points to. */
export const ACCOUNTING_ENTITY_ORDER: readonly AccountingEntityType[] = [
  "customer",
  "item",
  "invoice",
  "payment",
];

export type SyncState = "pending" | "sent" | "attention" | "skipped";

/**
 * Why a record needs a person. Each has one fixed sentence on screen
 * (shared/lib/accounting/attention-copy.ts); the detail fills in facts.
 */
export type AttentionCode =
  /** QuickBooks worked out a different total (almost always sales tax). */
  | "total_mismatch"
  /** QuickBooks says the invoice is already paid; the payment was not sent. */
  | "invoice_already_paid"
  /** The invoice this payment belongs to could not be sent. */
  | "invoice_not_sent"
  /** The customer this invoice belongs to could not be sent. */
  | "customer_not_sent"
  /** A price book item on this invoice could not be sent. */
  | "item_not_sent"
  /** QuickBooks refused the record; the detail carries its error number. */
  | "rejected"
  /** QuickBooks kept failing; Altair stopped retrying on its own. */
  | "quickbooks_unavailable"
  /** A voided invoice that already has payments in QuickBooks. */
  | "void_has_payments"
  /** The name is used by a QuickBooks vendor or employee; sent under another. */
  | "renamed_for_quickbooks"
  /** Sales tax is off in QuickBooks but the invoice has tax. */
  | "tax_off_in_quickbooks";

/** Plain facts for the on-screen sentence. Never a QuickBooks error body. */
export type AttentionDetail = {
  readonly label?: string;
  readonly altairTotal?: number;
  readonly quickbooksTotal?: number;
  readonly altairTax?: number;
  readonly quickbooksTax?: number;
  readonly address?: string;
  readonly sentAs?: string;
  readonly quickbooksErrorCode?: string;
  readonly blockedBy?: string;
};

export type SyncRecord = {
  readonly id: string;
  readonly entityType: AccountingEntityType;
  readonly localId: string;
  readonly remoteId: string | null;
  readonly remoteSyncToken: string | null;
  readonly state: SyncState;
  /**
   * Hash of what was last sent. Prefixed "linked:" when Altair found an
   * existing QuickBooks record and linked to it instead of creating one:
   * Altair never edits a record somebody made in QuickBooks.
   */
  readonly sentFingerprint: string | null;
  readonly attempts: number;
};

// ============================== Altair records ==============================

export type LocalAddress = {
  readonly line1: string;
  readonly line2: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
};

export type LocalCustomer = {
  readonly id: string;
  readonly name: string;
  readonly companyName: string | null;
  readonly email: string;
  readonly phone: string;
  readonly address: LocalAddress;
};

export type LocalItem = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly unitPrice: number;
  readonly taxable: boolean;
};

export type LocalInvoiceLine = {
  readonly serviceItemId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly taxable: boolean;
  readonly lineTotal: number;
};

export type LocalInvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "cancelled";

export type LocalInvoice = {
  readonly id: string;
  readonly number: string;
  readonly status: LocalInvoiceStatus;
  readonly customerId: string;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly lines: readonly LocalInvoiceLine[];
  readonly subtotal: number;
  readonly taxRate: number;
  readonly taxAmount: number;
  readonly total: number;
  readonly notes: string | null;
  /** Where the work was done (the job's address), else null. */
  readonly serviceAddress: LocalAddress | null;
};

export type LocalPaymentMethod = "cash" | "check" | "card" | "bank_transfer" | "other";

export type LocalPayment = {
  readonly id: string;
  readonly invoiceId: string;
  readonly amount: number;
  readonly method: LocalPaymentMethod;
  readonly paymentDate: string;
  readonly reference: string | null;
};

// ============================== the connection ==============================

export type TaxMode = "automated" | "manual" | "none";

/** What the engine needs from accounting_connections. */
export type ConnectionSettings = {
  readonly incomeAccountRef: string;
  /** null: Undeposited Funds (QuickBooks' default when none is given). */
  readonly depositAccountRef: string | null;
  readonly taxMode: TaxMode;
  readonly manualTaxCodeRef: string | null;
  readonly customDocNumbers: boolean;
  /** The QuickBooks item a hand-typed line is sent as. */
  readonly generalItemRef: string;
};

// ============================== the seams ==============================

export interface SyncStore {
  /** Records waiting to be sent and due now, oldest first. */
  listDue(limit: number): Promise<readonly SyncRecord[]>;
  /** The record for one Altair record, creating a pending one if absent. */
  ensureRecord(entityType: AccountingEntityType, localId: string): Promise<SyncRecord>;

  markSent(
    recordId: string,
    sent: { remoteId: string; remoteSyncToken: string | null; fingerprint: string; intuitTid: string | null },
  ): Promise<void>;
  /** Hold for a person. remoteId is kept when the record did reach QuickBooks. */
  markAttention(
    recordId: string,
    attention: {
      code: AttentionCode;
      detail: AttentionDetail;
      intuitTid: string | null;
      remoteId?: string | null;
      remoteSyncToken?: string | null;
      fingerprint?: string | null;
    },
  ): Promise<void>;
  markSkipped(recordId: string): Promise<void>;
  /** Try again later; the attempt is counted. */
  scheduleRetry(recordId: string, at: Date, intuitTid: string | null): Promise<void>;

  loadCustomer(localId: string): Promise<LocalCustomer | null>;
  loadItem(localId: string): Promise<LocalItem | null>;
  loadInvoice(localId: string): Promise<LocalInvoice | null>;
  loadPayment(localId: string): Promise<LocalPayment | null>;
}

/** A QuickBooks record as far as the engine cares. */
export type RemoteRef = {
  readonly id: string;
  readonly syncToken: string;
};

export type RemoteInvoice = RemoteRef & {
  readonly totalAmt: number;
  readonly totalTax: number;
  readonly balance: number;
};

export type QboEntityName = "Customer" | "Item" | "Invoice" | "Payment";

export type QboWriteResult = {
  readonly ref: RemoteRef;
  /** Only for invoices: what QuickBooks made of it. */
  readonly invoice?: RemoteInvoice;
  readonly intuitTid: string | null;
};

export interface QboApi {
  findCustomer(by: { email?: string; displayName?: string }): Promise<RemoteRef | null>;
  findItemByName(name: string): Promise<RemoteRef | null>;
  findInvoiceByDocNumber(docNumber: string): Promise<RemoteInvoice | null>;
  readInvoice(id: string): Promise<RemoteInvoice | null>;
  create(entity: QboEntityName, body: Record<string, unknown>, requestId: string): Promise<QboWriteResult>;
  /** Sparse update; body carries Id and SyncToken. */
  update(entity: QboEntityName, body: Record<string, unknown>, requestId: string): Promise<QboWriteResult>;
  voidInvoice(ref: RemoteRef, requestId: string): Promise<QboWriteResult>;
}
