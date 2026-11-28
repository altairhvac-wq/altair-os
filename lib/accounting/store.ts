import "server-only";

import type {
  AccountingEntityType,
  AttentionCode,
  AttentionDetail,
  LocalAddress,
  LocalCustomer,
  LocalInvoice,
  LocalInvoiceStatus,
  LocalItem,
  LocalPayment,
  LocalPaymentMethod,
  SyncRecord,
  SyncStore,
} from "@/lib/accounting/types";
import type { Database } from "@/lib/database/types/database";
import type { Json } from "@/lib/database/types/enums";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * The engine's SyncStore against Supabase, for ONE company and ONE
 * connection. Service role (the queue is not writable by any session), so
 * every query is scoped by company_id and connection_id here, explicitly:
 * the scoping RLS would otherwise do.
 *
 * Demo data and records in the trash read as missing, so they are never sent.
 */

type RecordRow = Database["public"]["Tables"]["accounting_sync_records"]["Row"];

function toRecord(row: RecordRow): SyncRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    localId: row.local_id,
    remoteId: row.remote_id,
    remoteSyncToken: row.remote_sync_token,
    state: row.state,
    sentFingerprint: row.sent_fingerprint,
    attempts: row.attempts,
  };
}

const RECORD_COLUMNS = "id, entity_type, local_id, remote_id, remote_sync_token, state, sent_fingerprint, attempts, company_id, connection_id, attention_code, attention_detail, attention_at, handled_at, next_attempt_at, last_attempt_at, last_intuit_tid, sent_at, created_at, updated_at";

export class SupabaseSyncStore implements SyncStore {
  private readonly companyId: string;
  private readonly connectionId: string;
  private readonly client = createServiceRoleClient();

  constructor(input: { companyId: string; connectionId: string }) {
    this.companyId = input.companyId;
    this.connectionId = input.connectionId;
  }

  private records() {
    return this.client.from("accounting_sync_records");
  }

  async listDue(limit: number): Promise<readonly SyncRecord[]> {
    const { data, error } = await this.records()
      .select(RECORD_COLUMNS)
      .eq("company_id", this.companyId)
      .eq("connection_id", this.connectionId)
      .eq("state", "pending")
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error("Could not read the QuickBooks queue.");
    return (data ?? []).map((row) => toRecord(row as RecordRow));
  }

  async ensureRecord(entityType: AccountingEntityType, localId: string): Promise<SyncRecord> {
    const find = () =>
      this.records()
        .select(RECORD_COLUMNS)
        .eq("connection_id", this.connectionId)
        .eq("entity_type", entityType)
        .eq("local_id", localId)
        .maybeSingle();
    const found = await find();
    if (found.data) return toRecord(found.data as RecordRow);
    await this.records().upsert(
      {
        company_id: this.companyId,
        connection_id: this.connectionId,
        entity_type: entityType,
        local_id: localId,
        state: "pending",
        next_attempt_at: new Date().toISOString(),
      },
      { onConflict: "connection_id,entity_type,local_id", ignoreDuplicates: true },
    );
    const again = await find();
    if (!again.data) throw new Error("Could not queue a QuickBooks record.");
    return toRecord(again.data as RecordRow);
  }

  private async updateRecord(recordId: string, patch: Database["public"]["Tables"]["accounting_sync_records"]["Update"]): Promise<void> {
    const { error } = await this.records()
      .update({ ...patch, last_attempt_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("connection_id", this.connectionId);
    if (error) throw new Error("Could not update the QuickBooks queue.");
  }

  async markSent(recordId: string, sent: { remoteId: string; remoteSyncToken: string | null; fingerprint: string; intuitTid: string | null }): Promise<void> {
    await this.updateRecord(recordId, {
      state: "sent",
      remote_id: sent.remoteId,
      remote_sync_token: sent.remoteSyncToken,
      sent_fingerprint: sent.fingerprint,
      last_intuit_tid: sent.intuitTid,
      sent_at: new Date().toISOString(),
      attempts: 0,
      next_attempt_at: null,
      attention_code: null,
      attention_detail: {},
      attention_at: null,
    });
  }

  async markAttention(
    recordId: string,
    attention: { code: AttentionCode; detail: AttentionDetail; intuitTid: string | null; remoteId?: string | null; remoteSyncToken?: string | null; fingerprint?: string | null },
  ): Promise<void> {
    await this.updateRecord(recordId, {
      state: "attention",
      attention_code: attention.code,
      attention_detail: attention.detail as Json,
      attention_at: new Date().toISOString(),
      handled_at: null,
      last_intuit_tid: attention.intuitTid,
      next_attempt_at: null,
      ...(attention.remoteId
        ? {
            remote_id: attention.remoteId,
            remote_sync_token: attention.remoteSyncToken ?? null,
            sent_fingerprint: attention.fingerprint ?? null,
            sent_at: new Date().toISOString(),
          }
        : {}),
    });
  }

  async markSkipped(recordId: string): Promise<void> {
    await this.updateRecord(recordId, { state: "skipped", next_attempt_at: null });
  }

  async clear(recordId: string): Promise<void> {
    await this.records().delete().eq("id", recordId).eq("connection_id", this.connectionId).is("remote_id", null);
  }

  async scheduleRetry(recordId: string, at: Date, intuitTid: string | null): Promise<void> {
    const { data } = await this.records().select("attempts").eq("id", recordId).eq("connection_id", this.connectionId).maybeSingle();
    await this.updateRecord(recordId, {
      attempts: Math.min((data?.attempts ?? 0) + 1, 1000),
      next_attempt_at: at.toISOString(),
      last_intuit_tid: intuitTid,
    });
  }

  // ============================== Altair records ==============================

  async loadCustomer(localId: string): Promise<LocalCustomer | null> {
    const { data } = await this.client
      .from("customers")
      .select("id, name, company_name, email, phone, address_line1, address_line2, city, state, postal_code, is_demo, deleted_at")
      .eq("company_id", this.companyId)
      .eq("id", localId)
      .maybeSingle();
    if (!data || data.is_demo || data.deleted_at) return null;
    return {
      id: data.id,
      name: data.name ?? "",
      companyName: data.company_name,
      email: data.email ?? "",
      phone: data.phone ?? "",
      address: {
        line1: data.address_line1 ?? "",
        line2: data.address_line2 ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        postalCode: data.postal_code ?? "",
      },
    };
  }

  async loadItem(localId: string): Promise<LocalItem | null> {
    const { data } = await this.client
      .from("service_items")
      .select("id, name, description, unit_price, taxable, is_demo, deleted_at")
      .eq("company_id", this.companyId)
      .eq("id", localId)
      .maybeSingle();
    if (!data || data.is_demo || data.deleted_at) return null;
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      unitPrice: Number(data.unit_price ?? 0),
      taxable: Boolean(data.taxable),
    };
  }

  async loadInvoice(localId: string): Promise<LocalInvoice | null> {
    const { data } = await this.client
      .from("invoices")
      .select("id, invoice_number, status, customer_id, job_id, issue_date, due_date, subtotal, tax_rate, tax_amount, total, notes, is_demo, deleted_at")
      .eq("company_id", this.companyId)
      .eq("id", localId)
      .maybeSingle();
    if (!data || data.is_demo || data.deleted_at) return null;

    const { data: lines } = await this.client
      .from("invoice_line_items")
      .select("service_item_id, name, description, quantity, unit_price, taxable, line_total, sort_order")
      .eq("company_id", this.companyId)
      .eq("invoice_id", localId)
      .order("sort_order", { ascending: true });

    let serviceAddress: LocalAddress | null = null;
    if (data.job_id) {
      const { data: job } = await this.client
        .from("jobs")
        .select("service_address, city, state, postal_code")
        .eq("company_id", this.companyId)
        .eq("id", data.job_id)
        .maybeSingle();
      if (job) {
        serviceAddress = {
          line1: job.service_address ?? "",
          line2: "",
          city: job.city ?? "",
          state: job.state ?? "",
          postalCode: job.postal_code ?? "",
        };
      }
    }

    return {
      id: data.id,
      number: data.invoice_number,
      status: data.status as LocalInvoiceStatus,
      customerId: data.customer_id,
      issueDate: data.issue_date,
      dueDate: data.due_date,
      lines: (lines ?? []).map((line) => ({
        serviceItemId: line.service_item_id,
        name: line.name,
        description: line.description,
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.unit_price ?? 0),
        taxable: Boolean(line.taxable),
        lineTotal: Number(line.line_total ?? 0),
      })),
      subtotal: Number(data.subtotal ?? 0),
      taxRate: Number(data.tax_rate ?? 0),
      taxAmount: Number(data.tax_amount ?? 0),
      total: Number(data.total ?? 0),
      notes: data.notes,
      serviceAddress,
    };
  }

  async loadPayment(localId: string): Promise<LocalPayment | null> {
    const { data } = await this.client
      .from("invoice_payments")
      .select("id, invoice_id, amount, payment_method, payment_date, reference, is_demo, status")
      .eq("company_id", this.companyId)
      .eq("id", localId)
      .maybeSingle();
    if (!data || data.is_demo || data.status !== "succeeded") return null;
    return {
      id: data.id,
      invoiceId: data.invoice_id,
      amount: Number(data.amount ?? 0),
      method: data.payment_method as LocalPaymentMethod,
      paymentDate: data.payment_date,
      reference: data.reference,
    };
  }
}
