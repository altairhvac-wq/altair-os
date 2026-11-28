import "server-only";

import { classifyQboFailure, QboError } from "@/lib/accounting/quickbooks/errors";
import { QBO_API_ORIGINS, QBO_MINOR_VERSION, type QuickBooksEnvironment } from "@/lib/accounting/quickbooks/env";
import type {
  QboApi,
  QboEntityName,
  QboWriteResult,
  RemoteInvoice,
  RemoteRef,
  TaxMode,
} from "@/lib/accounting/types";

/**
 * The QuickBooks Online Accounting API for one company (realm).
 *
 * Every call: minorversion 75, a 30-second timeout, intuit_tid kept for
 * support, failures classified (./errors.ts) and never forwarded. Writes
 * carry ?requestid= so a retried write is not made twice. No batch endpoint:
 * Intuit meters batch calls as reads.
 *
 * The access token comes from a function, not a field, so a call that starts
 * after the hour is up gets a fresh one (lib/accounting/connection.ts).
 */

const REQUEST_TIMEOUT_MS = 30_000;

type Fetched = { body: unknown; intuitTid: string | null };

export type QboAccount = { readonly id: string; readonly name: string; readonly type: string; readonly subType: string };
export type QboTaxCode = { readonly id: string; readonly name: string };

export type QboCompanyFacts = {
  readonly companyName: string | null;
  readonly taxMode: TaxMode;
  readonly customDocNumbers: boolean;
};

export class HttpQboApi implements QboApi {
  private readonly base: string;
  private readonly getAccessToken: () => Promise<string>;

  constructor(input: { realmId: string; environment: QuickBooksEnvironment; getAccessToken: () => Promise<string> }) {
    if (!/^\d{1,30}$/.test(input.realmId)) throw new Error("Invalid QuickBooks company id.");
    this.base = `${QBO_API_ORIGINS[input.environment]}/v3/company/${input.realmId}`;
    this.getAccessToken = input.getAccessToken;
  }

  private async request(method: "GET" | "POST", path: string, params: Record<string, string>, body?: unknown): Promise<Fetched> {
    const url = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries({ ...params, minorversion: QBO_MINOR_VERSION })) {
      url.searchParams.set(key, value);
    }
    const token = await this.getAccessToken();
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new QboError({ kind: "network" });
    }
    const intuitTid = response.headers.get("intuit_tid");
    const parsed = await response.json().catch(() => null);
    if (!response.ok) {
      throw classifyQboFailure({
        status: response.status,
        body: parsed,
        intuitTid,
        retryAfterHeader: response.headers.get("retry-after"),
      });
    }
    // QuickBooks can answer 200 with a Fault body.
    if (parsed && typeof parsed === "object" && "Fault" in parsed) {
      throw classifyQboFailure({ status: 400, body: parsed, intuitTid });
    }
    return { body: parsed, intuitTid };
  }

  private async query<T>(statement: string, entity: string): Promise<T[]> {
    const { body } = await this.request("GET", "/query", { query: statement });
    const rows = (body as { QueryResponse?: Record<string, unknown> } | null)?.QueryResponse?.[entity];
    return Array.isArray(rows) ? (rows as T[]) : [];
  }

  // ============================== QboApi ==============================

  async findCustomer(by: { email?: string; displayName?: string }): Promise<RemoteRef | null> {
    const where = by.email
      ? `PrimaryEmailAddr = '${quote(by.email)}'`
      : by.displayName
        ? `DisplayName = '${quote(by.displayName)}'`
        : null;
    if (!where) return null;
    const rows = await this.query<{ Id: string; SyncToken: string }>(`select * from Customer where ${where} MAXRESULTS 1`, "Customer");
    return rows[0] ? { id: rows[0].Id, syncToken: rows[0].SyncToken } : null;
  }

  async findItemByName(name: string): Promise<RemoteRef | null> {
    const rows = await this.query<{ Id: string; SyncToken: string }>(`select * from Item where Name = '${quote(name)}' MAXRESULTS 1`, "Item");
    return rows[0] ? { id: rows[0].Id, syncToken: rows[0].SyncToken } : null;
  }

  async findInvoiceByDocNumber(docNumber: string): Promise<RemoteInvoice | null> {
    const rows = await this.query<RawInvoice>(`select * from Invoice where DocNumber = '${quote(docNumber)}' MAXRESULTS 1`, "Invoice");
    return rows[0] ? toRemoteInvoice(rows[0]) : null;
  }

  async readInvoice(id: string): Promise<RemoteInvoice | null> {
    try {
      const { body } = await this.request("GET", `/invoice/${encodeURIComponent(id)}`, {});
      const invoice = (body as { Invoice?: RawInvoice } | null)?.Invoice;
      return invoice ? toRemoteInvoice(invoice) : null;
    } catch (error) {
      if (error instanceof QboError && error.kind === "not_found") return null;
      throw error;
    }
  }

  async readSyncToken(entity: QboEntityName, id: string): Promise<string | null> {
    const { body } = await this.request("GET", `/${entity.toLowerCase()}/${encodeURIComponent(id)}`, {});
    const record = (body as Record<string, { SyncToken?: unknown }> | null)?.[entity];
    return typeof record?.SyncToken === "string" ? record.SyncToken : null;
  }

  async create(entity: QboEntityName, body: Record<string, unknown>, requestId: string): Promise<QboWriteResult> {
    return this.write(entity, body, requestId, {});
  }

  async update(entity: QboEntityName, body: Record<string, unknown>, requestId: string): Promise<QboWriteResult> {
    return this.write(entity, body, requestId, {});
  }

  async voidInvoice(ref: RemoteRef, requestId: string): Promise<QboWriteResult> {
    return this.write("Invoice", { Id: ref.id, SyncToken: ref.syncToken }, requestId, { operation: "void" });
  }

  private async write(entity: QboEntityName, body: Record<string, unknown>, requestId: string, params: Record<string, string>): Promise<QboWriteResult> {
    const { body: answer, intuitTid } = await this.request("POST", `/${entity.toLowerCase()}`, { ...params, requestid: requestId }, body);
    const record = (answer as Record<string, RawInvoice> | null)?.[entity];
    if (!record?.Id) throw new QboError({ kind: "server", intuitTid });
    return {
      ref: { id: record.Id, syncToken: record.SyncToken ?? "0" },
      invoice: entity === "Invoice" ? toRemoteInvoice(record) : undefined,
      intuitTid,
    };
  }

  // ============================== setup reads ==============================

  /** Company name, how it does sales tax, and whether apps may set invoice numbers. */
  async readCompanyFacts(): Promise<QboCompanyFacts> {
    const [info, prefs] = await Promise.all([
      this.query<{ CompanyName?: string }>("select * from CompanyInfo", "CompanyInfo"),
      this.query<RawPreferences>("select * from Preferences", "Preferences"),
    ]);
    const pref = prefs[0] ?? {};
    // PartnerTaxEnabled present = Automated Sales Tax (true: set up, false:
    // not set up yet). Absent = the older, manual sales tax.
    const partner = pref.TaxPrefs?.PartnerTaxEnabled;
    const usingSalesTax = pref.TaxPrefs?.UsingSalesTax;
    let taxMode: TaxMode;
    if (partner === true) taxMode = "automated";
    else if (partner === false) taxMode = "none";
    else taxMode = usingSalesTax ? "manual" : "none";
    return {
      companyName: info[0]?.CompanyName?.trim() || null,
      taxMode,
      customDocNumbers: pref.SalesFormsPrefs?.CustomTxnNumbers === true,
    };
  }

  async listAccounts(): Promise<QboAccount[]> {
    const rows = await this.query<{ Id: string; Name: string; AccountType: string; AccountSubType?: string }>(
      "select * from Account where Active = true MAXRESULTS 1000",
      "Account",
    );
    return rows.map((row) => ({ id: row.Id, name: row.Name, type: row.AccountType, subType: row.AccountSubType ?? "" }));
  }

  async listTaxCodes(): Promise<QboTaxCode[]> {
    const rows = await this.query<{ Id: string; Name: string }>("select * from TaxCode where Active = true MAXRESULTS 1000", "TaxCode");
    return rows.map((row) => ({ id: row.Id, name: row.Name }));
  }

  /** The item a hand-typed invoice line is sent as: found by name, or made. */
  async ensureGeneralItem(incomeAccountRef: string, requestId: string): Promise<string> {
    const name = "Altair service";
    const existing = await this.findItemByName(name);
    if (existing) return existing.id;
    const result = await this.create(
      "Item",
      { Name: name, Type: "Service", IncomeAccountRef: { value: incomeAccountRef }, Description: "Work invoiced in Altair without a price book item." },
      requestId,
    );
    return result.ref.id;
  }
}

type RawInvoice = { Id: string; SyncToken?: string; TotalAmt?: number; Balance?: number; TxnTaxDetail?: { TotalTax?: number } };
type RawPreferences = {
  TaxPrefs?: { PartnerTaxEnabled?: boolean; UsingSalesTax?: boolean };
  SalesFormsPrefs?: { CustomTxnNumbers?: boolean };
};

function toRemoteInvoice(raw: RawInvoice): RemoteInvoice {
  return {
    id: raw.Id,
    syncToken: raw.SyncToken ?? "0",
    totalAmt: Number(raw.TotalAmt ?? 0),
    totalTax: Number(raw.TxnTaxDetail?.TotalTax ?? 0),
    balance: Number(raw.Balance ?? 0),
  };
}

/** QuickBooks' query language escapes a quote with a backslash. */
function quote(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
