/**
 * The accounting sync engine: sends one company's waiting records to its
 * QuickBooks Online, in order, and records what happened to each.
 *
 * ============================== WHAT IT PROMISES ==============================
 *  1. Never a duplicate. Before creating a customer it looks for the same
 *     email, then the same name, and links to what it finds. Before creating
 *     an invoice with Altair's number it looks for that number. Every write
 *     carries an idempotency key, so a write retried after a lost answer is
 *     not made twice.
 *  2. Never edits what somebody made in QuickBooks. A linked record is marked
 *     "linked:" and only ever read.
 *  3. Never changes money quietly. After an invoice is written, QuickBooks'
 *     total is compared with Altair's. A difference (almost always sales
 *     tax) puts the invoice on the owner's "Needs attention" list with both
 *     numbers; neither side is adjusted.
 *  4. A payment is sent only against an invoice QuickBooks still shows as
 *     owing that much, so a payment somebody already entered by hand is not
 *     counted twice.
 *  5. One bad record holds up only the records that depend on it.
 *  6. It stops for the company, not per record, when QuickBooks refuses the
 *     keys (the owner must connect again) or asks it to slow down.
 *
 * No database, network or Next import: handed a SyncStore and a QboApi
 * (./types.ts), so scripts/verify-quickbooks.mjs runs every rule here against
 * a practice QuickBooks.
 */
import { isQboError, type QboError } from "@/lib/accounting/quickbooks/errors";
import {
  alternateCustomerDisplayNames,
  alternateItemNames,
  buildCustomerBody,
  buildInvoiceBody,
  buildItemBody,
  buildPaymentBody,
  customerDisplayName,
  fingerprintBody,
  itemName,
  requestIdFor,
  roundMoney,
} from "@/lib/accounting/quickbooks/payloads";
import {
  ACCOUNTING_ENTITY_ORDER,
  type AttentionCode,
  type AttentionDetail,
  type ConnectionSettings,
  type LocalAddress,
  type LocalCustomer,
  type LocalPayment,
  type QboApi,
  type QboWriteResult,
  type RemoteInvoice,
  type SyncRecord,
  type SyncStore,
} from "@/lib/accounting/types";

export const LINKED_PREFIX = "linked:";
export const VOIDED_FINGERPRINT = "void";

/** After this many failed tries a record waits for a person. */
export const MAX_AUTOMATIC_ATTEMPTS = 8;

/** Minutes to wait after the Nth failure (1-based); the last value repeats. */
const RETRY_MINUTES = [5, 30, 120, 720, 1440];

export function retryDelayMinutes(attempts: number): number {
  return RETRY_MINUTES[Math.min(Math.max(attempts, 1), RETRY_MINUTES.length) - 1];
}

export type EngineStopReason = "auth" | "rate_limit" | "deadline";

export type EngineResult = {
  readonly processed: number;
  readonly sent: number;
  readonly unchanged: number;
  readonly attention: number;
  readonly retried: number;
  readonly skipped: number;
  readonly stoppedBecause: EngineStopReason | null;
};

export type EngineInput = {
  readonly store: SyncStore;
  readonly api: QboApi;
  readonly settings: ConnectionSettings;
  readonly maxRecords: number;
  /** Stop starting new records after this moment (serverless time limit). */
  readonly deadline: Date;
  readonly now?: () => Date;
};

type Counters = {
  processed: number;
  sent: number;
  unchanged: number;
  attention: number;
  retried: number;
  skipped: number;
};

/** A dependency that could not be sent: the record that needs it waits. */
type Blocked = { readonly blocked: true; readonly code: AttentionCode; readonly label: string };
type Ref = { readonly blocked: false; readonly remoteId: string };

class StopRun extends Error {
  readonly reason: EngineStopReason;
  constructor(reason: EngineStopReason) {
    super(`accounting sync stopped: ${reason}`);
    this.reason = reason;
  }
}

export async function runAccountingSync(input: EngineInput): Promise<EngineResult> {
  const now = input.now ?? (() => new Date());
  const counters: Counters = { processed: 0, sent: 0, unchanged: 0, attention: 0, retried: 0, skipped: 0 };
  const run = new SyncRun(input, counters, now);

  const due = [...(await input.store.listDue(input.maxRecords))].sort(
    (a, b) => ACCOUNTING_ENTITY_ORDER.indexOf(a.entityType) - ACCOUNTING_ENTITY_ORDER.indexOf(b.entityType),
  );

  let stoppedBecause: EngineStopReason | null = null;
  for (const record of due) {
    if (now() >= input.deadline) {
      stoppedBecause = "deadline";
      break;
    }
    // A dependency sent earlier in this run may already have handled it.
    if (run.handled.has(record.id)) continue;
    try {
      await run.process(record);
    } catch (error) {
      if (error instanceof StopRun) {
        stoppedBecause = error.reason;
        break;
      }
      throw error;
    }
  }

  return { ...counters, stoppedBecause };
}

class SyncRun {
  readonly handled = new Set<string>();
  private readonly customerRefs = new Map<string, Ref | Blocked>();
  private readonly itemRefs = new Map<string, Ref | Blocked>();

  private readonly input: EngineInput;
  private readonly counters: Counters;
  private readonly now: () => Date;

  constructor(input: EngineInput, counters: Counters, now: () => Date) {
    this.input = input;
    this.counters = counters;
    this.now = now;
  }

  private get store(): SyncStore {
    return this.input.store;
  }
  private get api(): QboApi {
    return this.input.api;
  }
  private get settings(): ConnectionSettings {
    return this.input.settings;
  }

  /** One record, with the failure handling every entity shares. */
  async process(record: SyncRecord): Promise<void> {
    this.handled.add(record.id);
    this.counters.processed += 1;
    try {
      switch (record.entityType) {
        case "customer":
          await this.syncCustomer(record);
          return;
        case "item":
          await this.syncItem(record);
          return;
        case "invoice":
          await this.syncInvoice(record);
          return;
        case "payment":
          await this.syncPayment(record);
          return;
      }
    } catch (error) {
      if (!isQboError(error)) throw error;
      await this.onQboError(record, error);
    }
  }

  private async onQboError(record: SyncRecord, error: QboError): Promise<void> {
    switch (error.kind) {
      case "auth":
        throw new StopRun("auth");
      case "rate_limit": {
        const seconds = error.retryAfterSeconds ?? 60;
        await this.store.scheduleRetry(record.id, new Date(this.now().getTime() + seconds * 1000), error.intuitTid);
        this.counters.retried += 1;
        throw new StopRun("rate_limit");
      }
      case "server":
      case "network":
      case "stale":
        await this.retryLater(record, error.intuitTid);
        return;
      case "duplicate_name":
      case "not_found":
      case "rejected":
        await this.attention(record, "rejected", { quickbooksErrorCode: error.code ?? undefined }, error.intuitTid);
        return;
    }
  }

  private async retryLater(record: SyncRecord, intuitTid: string | null): Promise<void> {
    const attempts = record.attempts + 1;
    if (attempts >= MAX_AUTOMATIC_ATTEMPTS) {
      await this.attention(record, "quickbooks_unavailable", {}, intuitTid);
      return;
    }
    const at = new Date(this.now().getTime() + retryDelayMinutes(attempts) * 60_000);
    await this.store.scheduleRetry(record.id, at, intuitTid);
    this.counters.retried += 1;
  }

  private async attention(
    record: SyncRecord,
    code: AttentionCode,
    detail: AttentionDetail,
    intuitTid: string | null,
    kept?: { remoteId: string; remoteSyncToken: string | null; fingerprint: string },
  ): Promise<void> {
    await this.store.markAttention(record.id, {
      code,
      detail,
      intuitTid,
      remoteId: kept?.remoteId ?? null,
      remoteSyncToken: kept?.remoteSyncToken ?? null,
      fingerprint: kept?.fingerprint ?? null,
    });
    this.counters.attention += 1;
  }

  private async sent(record: SyncRecord, result: { remoteId: string; remoteSyncToken: string | null; fingerprint: string; intuitTid: string | null }): Promise<void> {
    await this.store.markSent(record.id, result);
    this.counters.sent += 1;
  }

  private async unchanged(record: SyncRecord): Promise<void> {
    await this.store.markSent(record.id, {
      remoteId: record.remoteId as string,
      remoteSyncToken: record.remoteSyncToken,
      fingerprint: record.sentFingerprint ?? "",
      intuitTid: null,
    });
    this.counters.unchanged += 1;
  }

  private async cleared(record: SyncRecord): Promise<void> {
    await this.store.clear(record.id);
    this.counters.skipped += 1;
  }

  /**
   * Update a record Altair created, refetching the SyncToken once if
   * somebody changed it in QuickBooks since.
   */
  private async updateOwned(
    entity: "Customer" | "Item" | "Invoice",
    record: SyncRecord,
    body: Record<string, unknown>,
    requestId: string,
  ): Promise<QboWriteResult> {
    const remoteId = record.remoteId as string;
    let syncToken = record.remoteSyncToken ?? (await this.api.readSyncToken(entity, remoteId));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.api.update(entity, { ...body, Id: remoteId, SyncToken: syncToken ?? "0", sparse: true }, `${requestId.slice(0, 48)}u${attempt}`);
      } catch (error) {
        if (attempt === 0 && isQboError(error) && error.kind === "stale") {
          syncToken = await this.api.readSyncToken(entity, remoteId);
          continue;
        }
        throw error;
      }
    }
    // Unreachable: the loop either returns or throws.
    throw new Error("unreachable");
  }

  /**
   * Send a customer or item that an invoice needs. If QuickBooks refuses IT,
   * the refusal is recorded on that customer or item (where the owner can fix
   * it) and the invoice waits, naming it. A passing failure (QuickBooks down,
   * asked to slow down, keys refused) belongs to the invoice too and goes up.
   */
  private async sendDependency(
    record: SyncRecord,
    send: () => Promise<Ref | Blocked>,
    code: "customer_not_sent" | "item_not_sent",
  ): Promise<Ref | Blocked> {
    try {
      return await send();
    } catch (error) {
      if (!isQboError(error) || !["rejected", "not_found", "duplicate_name"].includes(error.kind)) throw error;
      this.counters.processed += 1;
      await this.attention(record, "rejected", { quickbooksErrorCode: error.code ?? undefined }, error.intuitTid);
      return { blocked: true, code, label: "" };
    }
  }

  // ============================== customers ==============================

  private async syncCustomer(record: SyncRecord): Promise<void> {
    const outcome = await this.sendCustomer(record);
    this.customerRefs.set(record.localId, outcome);
  }

  /** The QuickBooks id for an Altair customer, sending it first if needed. */
  private async customerRef(customerId: string): Promise<Ref | Blocked> {
    const cached = this.customerRefs.get(customerId);
    if (cached) return cached;
    const record = await this.store.ensureRecord("customer", customerId);
    let outcome: Ref | Blocked;
    if (record.state === "sent" && record.remoteId) {
      outcome = { blocked: false, remoteId: record.remoteId };
    } else if (record.state === "attention" && !record.remoteId) {
      outcome = { blocked: true, code: "customer_not_sent", label: "" };
    } else {
      this.handled.add(record.id);
      outcome = await this.sendDependency(record, () => this.sendCustomer(record), "customer_not_sent");
    }
    this.customerRefs.set(customerId, outcome);
    return outcome;
  }

  private async sendCustomer(record: SyncRecord): Promise<Ref | Blocked> {
    const customer = await this.store.loadCustomer(record.localId);
    if (!customer) {
      await this.cleared(record);
      return { blocked: true, code: "customer_not_sent", label: "a deleted customer" };
    }
    const displayName = customerDisplayName(customer);
    const body = buildCustomerBody(customer, displayName);
    const fingerprint = fingerprintBody(body);

    if (record.remoteId) {
      // Linked to a customer somebody made in QuickBooks: never edited.
      if (record.sentFingerprint?.startsWith(LINKED_PREFIX) || record.sentFingerprint === fingerprint) {
        await this.unchanged(record);
        return { blocked: false, remoteId: record.remoteId };
      }
      try {
        const result = await this.updateOwned("Customer", record, body, requestIdFor(record.id, fingerprint));
        await this.sent(record, { remoteId: result.ref.id, remoteSyncToken: result.ref.syncToken, fingerprint, intuitTid: result.intuitTid });
      } catch (error) {
        // Renamed in Altair to a name QuickBooks already has: keep the old
        // name there and send everything else.
        if (!isQboError(error) || error.kind !== "duplicate_name") throw error;
        const { DisplayName: _unused, ...rest } = body;
        const result = await this.updateOwned("Customer", record, rest, requestIdFor(record.id, fingerprint, "keepname"));
        await this.sent(record, { remoteId: result.ref.id, remoteSyncToken: result.ref.syncToken, fingerprint, intuitTid: result.intuitTid });
      }
      return { blocked: false, remoteId: record.remoteId };
    }

    const existing =
      (customer.email.trim() ? await this.api.findCustomer({ email: customer.email.trim() }) : null) ??
      (await this.api.findCustomer({ displayName }));
    if (existing) {
      await this.sent(record, { remoteId: existing.id, remoteSyncToken: existing.syncToken, fingerprint: `${LINKED_PREFIX}${fingerprint}`, intuitTid: null });
      return { blocked: false, remoteId: existing.id };
    }

    for (const name of [displayName, ...alternateCustomerDisplayNames(customer)]) {
      const attemptBody = name === displayName ? body : buildCustomerBody(customer, name);
      try {
        const result = await this.api.create("Customer", attemptBody, requestIdFor(record.id, fingerprint, name));
        await this.sent(record, { remoteId: result.ref.id, remoteSyncToken: result.ref.syncToken, fingerprint, intuitTid: result.intuitTid });
        return { blocked: false, remoteId: result.ref.id };
      } catch (error) {
        if (isQboError(error) && error.kind === "duplicate_name") continue;
        throw error;
      }
    }
    await this.attention(record, "rejected", { label: displayName, quickbooksErrorCode: "6240" }, null);
    return { blocked: true, code: "customer_not_sent", label: displayName };
  }

  // ============================== price book items ==============================

  private async syncItem(record: SyncRecord): Promise<void> {
    const outcome = await this.sendItem(record);
    this.itemRefs.set(record.localId, outcome);
  }

  private async itemRef(serviceItemId: string | null): Promise<Ref | Blocked> {
    if (!serviceItemId) return { blocked: false, remoteId: this.settings.generalItemRef };
    const cached = this.itemRefs.get(serviceItemId);
    if (cached) return cached;
    const record = await this.store.ensureRecord("item", serviceItemId);
    let outcome: Ref | Blocked;
    if (record.state === "sent" && record.remoteId) {
      outcome = { blocked: false, remoteId: record.remoteId };
    } else if (record.state === "attention" && !record.remoteId) {
      outcome = { blocked: true, code: "item_not_sent", label: "" };
    } else {
      this.handled.add(record.id);
      outcome = await this.sendDependency(record, () => this.sendItem(record), "item_not_sent");
    }
    this.itemRefs.set(serviceItemId, outcome);
    return outcome;
  }

  private async sendItem(record: SyncRecord): Promise<Ref | Blocked> {
    const item = await this.store.loadItem(record.localId);
    if (!item) {
      // Deleted from the price book: its lines go as the general item.
      await this.cleared(record);
      return { blocked: false, remoteId: this.settings.generalItemRef };
    }
    const name = itemName(item);
    const body = buildItemBody(item, name, this.settings);
    const fingerprint = fingerprintBody(body);

    if (record.remoteId) {
      if (record.sentFingerprint?.startsWith(LINKED_PREFIX) || record.sentFingerprint === fingerprint) {
        await this.unchanged(record);
        return { blocked: false, remoteId: record.remoteId };
      }
      try {
        const result = await this.updateOwned("Item", record, body, requestIdFor(record.id, fingerprint));
        await this.sent(record, { remoteId: result.ref.id, remoteSyncToken: result.ref.syncToken, fingerprint, intuitTid: result.intuitTid });
      } catch (error) {
        if (!isQboError(error) || error.kind !== "duplicate_name") throw error;
        const { Name: _unused, ...rest } = body;
        const result = await this.updateOwned("Item", record, rest, requestIdFor(record.id, fingerprint, "keepname"));
        await this.sent(record, { remoteId: result.ref.id, remoteSyncToken: result.ref.syncToken, fingerprint, intuitTid: result.intuitTid });
      }
      return { blocked: false, remoteId: record.remoteId };
    }

    const existing = await this.api.findItemByName(name);
    if (existing) {
      await this.sent(record, { remoteId: existing.id, remoteSyncToken: existing.syncToken, fingerprint: `${LINKED_PREFIX}${fingerprint}`, intuitTid: null });
      return { blocked: false, remoteId: existing.id };
    }
    for (const attemptName of [name, ...alternateItemNames(item)]) {
      const attemptBody = attemptName === name ? body : buildItemBody(item, attemptName, this.settings);
      try {
        const result = await this.api.create("Item", attemptBody, requestIdFor(record.id, fingerprint, attemptName));
        await this.sent(record, { remoteId: result.ref.id, remoteSyncToken: result.ref.syncToken, fingerprint, intuitTid: result.intuitTid });
        return { blocked: false, remoteId: result.ref.id };
      } catch (error) {
        if (isQboError(error) && error.kind === "duplicate_name") continue;
        throw error;
      }
    }
    await this.attention(record, "rejected", { label: name, quickbooksErrorCode: "6240" }, null);
    return { blocked: true, code: "item_not_sent", label: name };
  }

  // ============================== invoices ==============================

  private async syncInvoice(record: SyncRecord): Promise<void> {
    const invoice = await this.store.loadInvoice(record.localId);
    if (!invoice) {
      if (record.remoteId) {
        // Deleted in Altair after it reached QuickBooks. Nothing is deleted
        // there on Altair's say-so; it stays as sent.
        await this.unchanged(record);
      } else {
        await this.cleared(record);
      }
      return;
    }

    if (invoice.status === "draft") {
      // Back in draft (a send that failed and rolled back). Nothing to send.
      if (record.remoteId) await this.unchanged(record);
      else await this.cleared(record);
      return;
    }

    if (invoice.status === "void" || invoice.status === "cancelled") {
      if (!record.remoteId) {
        await this.cleared(record);
        return;
      }
      if (record.sentFingerprint === VOIDED_FINGERPRINT) {
        await this.unchanged(record);
        return;
      }
      const syncToken = record.remoteSyncToken ?? (await this.api.readSyncToken("Invoice", record.remoteId));
      try {
        const result = await this.api.voidInvoice(
          { id: record.remoteId, syncToken: syncToken ?? "0" },
          requestIdFor(record.id, VOIDED_FINGERPRINT, "void"),
        );
        await this.sent(record, { remoteId: record.remoteId, remoteSyncToken: result.ref.syncToken, fingerprint: VOIDED_FINGERPRINT, intuitTid: result.intuitTid });
      } catch (error) {
        if (!isQboError(error) || error.kind !== "rejected") throw error;
        await this.attention(
          record,
          "void_has_payments",
          { label: `Invoice ${invoice.number}`, quickbooksErrorCode: error.code ?? undefined },
          error.intuitTid,
          { remoteId: record.remoteId, remoteSyncToken: record.remoteSyncToken, fingerprint: record.sentFingerprint ?? "" },
        );
      }
      return;
    }

    const customer = await this.store.loadCustomer(invoice.customerId);
    const label = `Invoice ${invoice.number}${customer ? `, ${customer.name}` : ""}, $${invoice.total.toFixed(2)}`;
    if (!customer) {
      await this.attention(record, "customer_not_sent", { label, blockedBy: "a deleted customer" }, null);
      return;
    }

    const customerRef = await this.customerRef(invoice.customerId);
    if (customerRef.blocked) {
      await this.attention(record, "customer_not_sent", { label, blockedBy: customer.name }, null);
      return;
    }
    const lineItemRefs: string[] = [];
    for (const line of invoice.lines) {
      const ref = await this.itemRef(line.serviceItemId);
      if (ref.blocked) {
        await this.attention(record, "item_not_sent", { label, blockedBy: line.name }, null);
        return;
      }
      lineItemRefs.push(ref.remoteId);
    }

    const body = buildInvoiceBody(invoice, customer, { customerRef: customerRef.remoteId, lineItemRefs }, this.settings);
    const fingerprint = fingerprintBody(body);

    if (record.remoteId && (record.sentFingerprint === fingerprint || record.sentFingerprint?.startsWith(LINKED_PREFIX))) {
      await this.unchanged(record);
      return;
    }

    let written: { ref: { id: string; syncToken: string }; invoice: RemoteInvoice | null; intuitTid: string | null; linked: boolean };
    if (record.remoteId) {
      const result = await this.updateOwned("Invoice", record, body, requestIdFor(record.id, fingerprint));
      written = { ref: result.ref, invoice: result.invoice ?? null, intuitTid: result.intuitTid, linked: false };
    } else {
      // Sent before (an earlier connection to the same QuickBooks company):
      // link instead of making a second copy.
      const existing = typeof body.DocNumber === "string" ? await this.api.findInvoiceByDocNumber(body.DocNumber) : null;
      if (existing) {
        written = { ref: existing, invoice: existing, intuitTid: null, linked: true };
      } else {
        const result = await this.api.create("Invoice", body, requestIdFor(record.id, fingerprint));
        written = { ref: result.ref, invoice: result.invoice ?? null, intuitTid: result.intuitTid, linked: false };
      }
    }

    const storedFingerprint = written.linked ? `${LINKED_PREFIX}${fingerprint}` : fingerprint;
    const remote = written.invoice ?? (await this.api.readInvoice(written.ref.id));
    const keep = { remoteId: written.ref.id, remoteSyncToken: written.ref.syncToken, fingerprint: storedFingerprint };
    // On a difference the QuickBooks id is kept but the fingerprint is not
    // (linked ones keep only the marker), so "Try again" writes and compares
    // again instead of calling the invoice unchanged.
    const keepForRecheck = { ...keep, fingerprint: written.linked ? LINKED_PREFIX : "" };

    if (this.settings.taxMode === "none" && invoice.taxAmount > 0) {
      await this.attention(
        record,
        "tax_off_in_quickbooks",
        { label, altairTax: roundMoney(invoice.taxAmount), altairTotal: roundMoney(invoice.total), quickbooksTotal: remote ? roundMoney(remote.totalAmt) : undefined },
        written.intuitTid,
        keepForRecheck,
      );
      return;
    }
    if (remote && Math.abs(roundMoney(remote.totalAmt) - roundMoney(invoice.total)) >= 0.01) {
      await this.attention(
        record,
        "total_mismatch",
        {
          label,
          altairTotal: roundMoney(invoice.total),
          quickbooksTotal: roundMoney(remote.totalAmt),
          altairTax: roundMoney(invoice.taxAmount),
          quickbooksTax: roundMoney(remote.totalTax),
          address: formatAddress(invoice.serviceAddress ?? customer.address),
        },
        written.intuitTid,
        keepForRecheck,
      );
      return;
    }
    await this.sent(record, { ...keep, intuitTid: written.intuitTid });
  }

  // ============================== payments ==============================

  private async syncPayment(record: SyncRecord): Promise<void> {
    if (record.remoteId) {
      // A payment never changes in Altair once recorded.
      await this.unchanged(record);
      return;
    }
    const payment = await this.store.loadPayment(record.localId);
    if (!payment) {
      await this.cleared(record);
      return;
    }
    const invoice = await this.store.loadInvoice(payment.invoiceId);
    const customer = invoice ? await this.store.loadCustomer(invoice.customerId) : null;
    const label = `Payment of $${payment.amount.toFixed(2)}${invoice ? ` on ${invoice.number}` : ""}${customer ? `, ${customer.name}` : ""}`;

    const invoiceRecord = await this.store.ensureRecord("invoice", payment.invoiceId);
    if (invoiceRecord.state === "skipped") {
      await this.store.markSkipped(record.id);
      this.counters.skipped += 1;
      return;
    }
    if (!invoiceRecord.remoteId) {
      if (invoiceRecord.state === "attention") {
        await this.attention(record, "invoice_not_sent", { label, blockedBy: invoice?.number }, null);
        return;
      }
      // The invoice is still on its way; it is sent first in every run, so
      // this only waits when the invoice itself is waiting.
      if (!this.handled.has(invoiceRecord.id) && invoiceRecord.state === "pending") {
        await this.process(invoiceRecord);
        const refreshed = await this.store.ensureRecord("invoice", payment.invoiceId);
        if (refreshed.remoteId) return this.sendPayment(record, payment, refreshed.remoteId, invoice, label);
      }
      await this.retryLater(record, null);
      return;
    }
    await this.sendPayment(record, payment, invoiceRecord.remoteId, invoice, label);
  }

  private async sendPayment(
    record: SyncRecord,
    payment: LocalPayment,
    invoiceRemoteId: string,
    invoice: { number: string; customerId: string } | null,
    label: string,
  ): Promise<void> {
    if (!invoice) {
      await this.attention(record, "invoice_not_sent", { label }, null);
      return;
    }
    const customerRef = await this.customerRef(invoice.customerId);
    if (customerRef.blocked) {
      await this.attention(record, "customer_not_sent", { label }, null);
      return;
    }
    const remoteInvoice = await this.api.readInvoice(invoiceRemoteId);
    if (!remoteInvoice || remoteInvoice.balance + 0.005 < roundMoney(payment.amount)) {
      await this.attention(
        record,
        "invoice_already_paid",
        { label, quickbooksTotal: remoteInvoice ? roundMoney(remoteInvoice.balance) : undefined },
        null,
      );
      return;
    }
    const body = buildPaymentBody(
      payment,
      { customerRef: customerRef.remoteId, invoiceRemoteId, invoiceNumber: invoice.number },
      this.settings,
    );
    const fingerprint = fingerprintBody(body);
    const result = await this.api.create("Payment", body, requestIdFor(record.id, fingerprint));
    await this.sent(record, { remoteId: result.ref.id, remoteSyncToken: result.ref.syncToken, fingerprint, intuitTid: result.intuitTid });
  }
}

function formatAddress(address: LocalAddress): string {
  return [address.line1, address.city].map((part) => part.trim()).filter(Boolean).join(", ");
}

/** For the verifier: the plain customer record shape the engine needs. */
export type { LocalCustomer };
