/**
 * QuickBooks Online sync: executes the real engine against a practice
 * QuickBooks and holds it to its promises.
 *
 * ============================== WHAT THE PRACTICE QUICKBOOKS ENFORCES ==============================
 * The rules that break real syncs, as Intuit documents them:
 *   - a customer DisplayName is unique across customers AND vendors (6240);
 *   - an item Name is unique;
 *   - an update must carry the current SyncToken (5010 when stale);
 *   - a line's Amount must equal Qty x UnitPrice;
 *   - the same ?requestid= is answered from memory, not written twice;
 *   - with Automated Sales Tax on, QuickBooks may put its own tax on an
 *     invoice whatever Altair sent;
 *   - a payment cannot exceed what the invoice still owes.
 * It can also be told to fail: a 500, a 429, a 401, or a lost answer after
 * the write went through.
 *
 * Run: npm run verify:quickbooks
 */
import { readFileSync } from "node:fs";

const engine = await import("@/lib/accounting/engine");
const payloads = await import("@/lib/accounting/quickbooks/payloads");
const errors = await import("@/lib/accounting/quickbooks/errors");
const { QboError } = errors;

let passed = 0;
let failedCount = 0;
function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failedCount += 1;
    console.log(`  FAIL  ${name}${detail !== undefined ? `\n        ${JSON.stringify(detail)}` : ""}`);
  }
}
function section(title) {
  console.log(`\n${title}`);
}
const round = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

// ============================== the practice QuickBooks ==============================

class PracticeQuickBooks {
  constructor(options = {}) {
    this.nextId = 100;
    this.customers = new Map();
    this.vendorNames = new Set(options.vendorNames ?? []);
    this.items = new Map();
    this.invoices = new Map();
    this.payments = new Map();
    this.requestMemory = new Map();
    this.astRate = options.astRate ?? null;
    this.failures = [];
    this.calls = { reads: 0, writes: 0 };
  }
  failNext(kind, { on, afterWrite = false, code } = {}) {
    this.failures.push({ kind, on, afterWrite, code });
  }
  takeFailure(op) {
    const index = this.failures.findIndex((f) => !f.on || f.on === op);
    if (index < 0) return null;
    return this.failures.splice(index, 1)[0];
  }
  raise(failure) {
    const status = { server: 500, rate_limit: 429, auth: 401, rejected: 400, network: 0 }[failure.kind];
    if (failure.kind === "network") throw new QboError({ kind: "network" });
    throw errors.classifyQboFailure({
      status,
      body: failure.code ? { Fault: { Error: [{ code: failure.code, Message: "SECRET-ECHO Ana Morales 3462 S" }] } } : {},
      intuitTid: "tid-practice",
    });
  }
  id() {
    this.nextId += 1;
    return String(this.nextId);
  }
  // ---- reads
  async findCustomer({ email, displayName }) {
    this.calls.reads += 1;
    for (const c of this.customers.values()) {
      if (email && c.PrimaryEmailAddr?.Address?.toLowerCase() === email.toLowerCase()) return { id: c.Id, syncToken: c.SyncToken };
      if (displayName && c.DisplayName === displayName) return { id: c.Id, syncToken: c.SyncToken };
    }
    return null;
  }
  async findItemByName(name) {
    this.calls.reads += 1;
    for (const i of this.items.values()) if (i.Name === name) return { id: i.Id, syncToken: i.SyncToken };
    return null;
  }
  async findInvoiceByDocNumber(docNumber) {
    this.calls.reads += 1;
    for (const i of this.invoices.values()) if (i.DocNumber === docNumber) return this.invoiceView(i);
    return null;
  }
  async readInvoice(id) {
    this.calls.reads += 1;
    const i = this.invoices.get(id);
    return i ? this.invoiceView(i) : null;
  }
  async readSyncToken(entity, id) {
    this.calls.reads += 1;
    return this.table(entity).get(id)?.SyncToken ?? null;
  }
  invoiceView(i) {
    return { id: i.Id, syncToken: i.SyncToken, totalAmt: i.TotalAmt, totalTax: i.TotalTax, balance: i.Balance };
  }
  table(entity) {
    return { Customer: this.customers, Item: this.items, Invoice: this.invoices, Payment: this.payments }[entity];
  }
  // ---- writes
  async create(entity, body, requestId) {
    return this.write(`create:${entity}`, requestId, () => this.doCreate(entity, body));
  }
  async update(entity, body, requestId) {
    return this.write(`update:${entity}`, requestId, () => this.doUpdate(entity, body));
  }
  async voidInvoice(ref, requestId) {
    return this.write("void:Invoice", requestId, () => {
      const inv = this.invoices.get(ref.id);
      if (inv.SyncToken !== ref.syncToken) this.raise({ kind: "rejected", code: "5010" });
      if (round(inv.Balance) < round(inv.TotalAmt)) this.raise({ kind: "rejected", code: "6430" });
      inv.Voided = true;
      inv.TotalAmt = 0;
      inv.Balance = 0;
      inv.SyncToken = String(Number(inv.SyncToken) + 1);
      return { ref: { id: inv.Id, syncToken: inv.SyncToken }, invoice: this.invoiceView(inv) };
    });
  }
  async write(op, requestId, perform) {
    if (typeof requestId !== "string" || requestId.length === 0 || requestId.length > 50) {
      throw new Error(`bad requestid ${requestId}`);
    }
    if (this.requestMemory.has(requestId)) return this.requestMemory.get(requestId);
    const failure = this.takeFailure(op);
    if (failure && !failure.afterWrite) this.raise(failure);
    this.calls.writes += 1;
    const result = { ...perform(), intuitTid: "tid-practice" };
    this.requestMemory.set(requestId, result);
    if (failure && failure.afterWrite) this.raise(failure);
    return result;
  }
  doCreate(entity, body) {
    if (entity === "Customer") {
      const taken = [...this.customers.values()].some((c) => c.DisplayName === body.DisplayName) || this.vendorNames.has(body.DisplayName);
      if (taken) this.raise({ kind: "rejected", code: "6240" });
      if (/[:\t\n]/.test(body.DisplayName)) this.raise({ kind: "rejected", code: "6000" });
      const c = { ...body, Id: this.id(), SyncToken: "0" };
      this.customers.set(c.Id, c);
      return { ref: { id: c.Id, syncToken: c.SyncToken } };
    }
    if (entity === "Item") {
      if ([...this.items.values()].some((i) => i.Name === body.Name)) this.raise({ kind: "rejected", code: "6240" });
      if (body.Name.length > 100) this.raise({ kind: "rejected", code: "6000" });
      const i = { ...body, Id: this.id(), SyncToken: "0" };
      this.items.set(i.Id, i);
      return { ref: { id: i.Id, syncToken: i.SyncToken } };
    }
    if (entity === "Invoice") {
      const inv = { ...body, Id: this.id(), SyncToken: "0" };
      this.price(inv);
      inv.Balance = inv.TotalAmt;
      this.invoices.set(inv.Id, inv);
      return { ref: { id: inv.Id, syncToken: inv.SyncToken }, invoice: this.invoiceView(inv) };
    }
    if (entity === "Payment") {
      const link = body.Line[0].LinkedTxn[0];
      const inv = this.invoices.get(link.TxnId);
      if (!inv) this.raise({ kind: "rejected", code: "610" });
      if (round(body.TotalAmt) > round(inv.Balance) + 0.005) this.raise({ kind: "rejected", code: "6000" });
      inv.Balance = round(inv.Balance - body.TotalAmt);
      const p = { ...body, Id: this.id(), SyncToken: "0" };
      this.payments.set(p.Id, p);
      return { ref: { id: p.Id, syncToken: p.SyncToken } };
    }
    throw new Error(`unknown entity ${entity}`);
  }
  doUpdate(entity, body) {
    const table = this.table(entity);
    const current = table.get(body.Id);
    if (!current) this.raise({ kind: "rejected", code: "610" });
    if (current.SyncToken !== body.SyncToken) this.raise({ kind: "rejected", code: "5010" });
    if (entity === "Customer" && body.DisplayName && body.DisplayName !== current.DisplayName) {
      const taken = [...this.customers.values()].some((c) => c.Id !== current.Id && c.DisplayName === body.DisplayName) || this.vendorNames.has(body.DisplayName);
      if (taken) this.raise({ kind: "rejected", code: "6240" });
    }
    const { sparse: _s, SyncToken: _t, ...rest } = body;
    Object.assign(current, rest);
    current.SyncToken = String(Number(current.SyncToken) + 1);
    if (entity === "Invoice") {
      const paid = round(current.TotalAmt - current.Balance);
      this.price(current);
      current.Balance = round(current.TotalAmt - paid);
      return { ref: { id: current.Id, syncToken: current.SyncToken }, invoice: this.invoiceView(current) };
    }
    return { ref: { id: current.Id, syncToken: current.SyncToken } };
  }
  price(inv) {
    if (!this.customers.has(inv.CustomerRef.value)) this.raise({ kind: "rejected", code: "610" });
    let subtotal = 0;
    let taxable = 0;
    for (const line of inv.Line) {
      const d = line.SalesItemLineDetail;
      if (!this.items.has(d.ItemRef.value)) this.raise({ kind: "rejected", code: "610" });
      if (Math.abs(round(d.Qty * d.UnitPrice) - round(line.Amount)) >= 0.005) this.raise({ kind: "rejected", code: "6070" });
      subtotal += line.Amount;
      if (d.TaxCodeRef?.value === "TAX") taxable += line.Amount;
    }
    const tax = this.astRate !== null ? round(taxable * this.astRate) : round(inv.TxnTaxDetail?.TotalTax ?? 0);
    inv.TotalTax = tax;
    inv.TotalAmt = round(subtotal + tax);
  }
}

// ============================== an in-memory Altair ==============================

class PracticeStore {
  constructor(data) {
    this.data = data;
    this.records = [];
    this.nextId = 1;
    this.clock = data.clock;
  }
  find(entityType, localId) {
    return this.records.find((r) => r.entityType === entityType && r.localId === localId);
  }
  queue(entityType, localId) {
    const existing = this.find(entityType, localId);
    if (existing) {
      if (existing.state === "skipped") return existing;
      Object.assign(existing, { state: "pending", nextAttemptAt: this.clock(), attempts: 0, attentionCode: null, attentionDetail: {} });
      return existing;
    }
    const record = {
      id: `0000000${this.nextId++}-aaaa-bbbb-cccc-dddddddddddd`.slice(-36),
      entityType,
      localId,
      remoteId: null,
      remoteSyncToken: null,
      state: "pending",
      sentFingerprint: null,
      attempts: 0,
      nextAttemptAt: this.clock(),
      attentionCode: null,
      attentionDetail: {},
      lastIntuitTid: null,
    };
    this.records.push(record);
    return record;
  }
  view(r) {
    return { id: r.id, entityType: r.entityType, localId: r.localId, remoteId: r.remoteId, remoteSyncToken: r.remoteSyncToken, state: r.state, sentFingerprint: r.sentFingerprint, attempts: r.attempts };
  }
  byId(id) {
    return this.records.find((r) => r.id === id);
  }
  async listDue(limit) {
    const now = this.clock();
    return this.records.filter((r) => r.state === "pending" && r.nextAttemptAt <= now).slice(0, limit).map((r) => this.view(r));
  }
  async ensureRecord(entityType, localId) {
    const existing = this.find(entityType, localId);
    return this.view(existing ?? this.queue(entityType, localId));
  }
  async markSent(id, s) {
    Object.assign(this.byId(id), { state: "sent", remoteId: s.remoteId, remoteSyncToken: s.remoteSyncToken, sentFingerprint: s.fingerprint, lastIntuitTid: s.intuitTid, attempts: 0, attentionCode: null, attentionDetail: {} });
  }
  async markAttention(id, a) {
    const r = this.byId(id);
    Object.assign(r, { state: "attention", attentionCode: a.code, attentionDetail: a.detail, lastIntuitTid: a.intuitTid });
    if (a.remoteId) Object.assign(r, { remoteId: a.remoteId, remoteSyncToken: a.remoteSyncToken ?? null, sentFingerprint: a.fingerprint ?? null });
  }
  async markSkipped(id) {
    this.byId(id).state = "skipped";
  }
  async clear(id) {
    this.records = this.records.filter((r) => r.id !== id);
  }
  async scheduleRetry(id, at, tid) {
    const r = this.byId(id);
    Object.assign(r, { attempts: r.attempts + 1, nextAttemptAt: at, lastIntuitTid: tid });
  }
  async loadCustomer(id) {
    return this.data.customers.get(id) ?? null;
  }
  async loadItem(id) {
    return this.data.items.get(id) ?? null;
  }
  async loadInvoice(id) {
    return this.data.invoices.get(id) ?? null;
  }
  async loadPayment(id) {
    return this.data.payments.get(id) ?? null;
  }
}

function makeWorld({ settings: settingsOverride = {}, qbo: qboOptions = {} } = {}) {
  let now = new Date("2026-12-01T16:00:00Z");
  const clock = () => now;
  const advance = (minutes) => {
    now = new Date(now.getTime() + minutes * 60_000);
  };
  const address = (line1, city) => ({ line1, line2: "", city, state: "UT", postalCode: "84119" });
  const customers = new Map([
    ["c-ana", { id: "c-ana", name: "Ana Morales", companyName: null, email: "ana.morales@example.com", phone: "(801) 555-0139", address: address("3462 S 3200 W", "West Valley City") }],
    ["c-bob", { id: "c-bob", name: "Bob Smith", companyName: null, email: "", phone: "", address: address("12 Elm St", "Murray") }],
  ]);
  const items = new Map([
    ["i-tank", { id: "i-tank", name: "50-Gal Gas Water Heater, Installed", description: "Remove old tank, install new.", unitPrice: 2450, taxable: true }],
    ["i-permit", { id: "i-permit", name: "Permit and Haul-Away", description: null, unitPrice: 185, taxable: false }],
  ]);
  const invoices = new Map();
  const payments = new Map();
  const store = new PracticeStore({ customers, items, invoices, payments, clock });
  const qbo = new PracticeQuickBooks(qboOptions);
  qbo.items.set("900", { Id: "900", SyncToken: "0", Name: "Services", Type: "Service" });
  const settings = {
    incomeAccountRef: "79",
    depositAccountRef: null,
    taxMode: "automated",
    manualTaxCodeRef: null,
    customDocNumbers: true,
    generalItemRef: "900",
    ...settingsOverride,
  };
  const run = (extra = {}) =>
    engine.runAccountingSync({ store, api: qbo, settings, maxRecords: 100, deadline: new Date(now.getTime() + 60_000), now: clock, ...extra });
  const addInvoice = (id, overrides = {}) => {
    const lines = overrides.lines ?? [
      { serviceItemId: "i-tank", name: "50-Gal Gas Water Heater, Installed", description: null, quantity: 1, unitPrice: 2450, taxable: true, lineTotal: 2450 },
      { serviceItemId: "i-permit", name: "Permit and Haul-Away", description: null, quantity: 1, unitPrice: 185, taxable: false, lineTotal: 185 },
    ];
    const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0));
    const taxRate = overrides.taxRate ?? 7.25;
    const taxable = lines.filter((l) => l.taxable).reduce((s, l) => s + l.lineTotal, 0);
    const taxAmount = round(taxable * taxRate / 100);
    const invoice = {
      id,
      number: overrides.number ?? `INV-${id}`,
      status: overrides.status ?? "sent",
      customerId: overrides.customerId ?? "c-ana",
      issueDate: "2026-12-01",
      dueDate: "2026-12-15",
      lines,
      subtotal,
      taxRate,
      taxAmount,
      total: round(subtotal + taxAmount),
      notes: null,
      serviceAddress: overrides.serviceAddress === undefined ? address("3462 S 3200 W", "West Valley City") : overrides.serviceAddress,
    };
    invoices.set(id, invoice);
    store.queue("invoice", id);
    return invoice;
  };
  const addPayment = (id, invoiceId, amount, method = "card") => {
    payments.set(id, { id, invoiceId, amount, method, paymentDate: "2026-12-02", reference: "ch_123" });
    store.queue("payment", id);
  };
  return { store, qbo, settings, run, addInvoice, addPayment, advance, customers, items, invoices, clock };
}

// ============================== 1. the happy path ==============================

section("1. A new invoice and its payment reach QuickBooks, once");
{
  const w = makeWorld();
  const inv = w.addInvoice("1001");
  w.addPayment("p1", "1001", 1000);
  const result = await w.run();
  const qInv = [...w.qbo.invoices.values()][0];
  check("one customer, two items, one invoice and one payment were created", w.qbo.customers.size === 1 && w.qbo.items.size === 3 && w.qbo.invoices.size === 1 && w.qbo.payments.size === 1, { c: w.qbo.customers.size, i: w.qbo.items.size, inv: w.qbo.invoices.size, p: w.qbo.payments.size });
  check("QuickBooks' total equals Altair's ($2,812.63)", qInv && round(qInv.TotalAmt) === inv.total, { qbo: qInv?.TotalAmt, altair: inv.total });
  check("the invoice carries Altair's number", qInv?.DocNumber === "INV-1001");
  check("lines say TAX and NON", qInv?.Line[0].SalesItemLineDetail.TaxCodeRef.value === "TAX" && qInv?.Line[1].SalesItemLineDetail.TaxCodeRef.value === "NON");
  check("the job site is the ship-to address (where sales tax is owed)", qInv?.ShipAddr?.Line1 === "3462 S 3200 W" && qInv?.ShipAddr?.City === "West Valley City");
  check("the payment is linked to the invoice and lowers its balance", round(qInv.Balance) === round(inv.total - 1000));
  check("with no deposit account picked, the payment goes to Undeposited Funds (none sent)", [...w.qbo.payments.values()][0].DepositToAccountRef === undefined);
  check("every record is marked sent", w.store.records.every((r) => r.state === "sent"), w.store.records.map((r) => [r.entityType, r.state, r.attentionCode]));
  check("the run reports what it did", result.sent >= 4 && result.stoppedBecause === null, result);

  const writesBefore = w.qbo.calls.writes;
  for (const r of w.store.records) r.state = "pending";
  const again = await w.run();
  check("re-running with nothing changed writes nothing", w.qbo.calls.writes === writesBefore, { writes: w.qbo.calls.writes - writesBefore, again });
}

// ============================== 2. duplicates ==============================

section("2. No duplicates");
{
  const w = makeWorld();
  w.qbo.customers.set("50", { Id: "50", SyncToken: "3", DisplayName: "Ana M. (from bookkeeper)", PrimaryEmailAddr: { Address: "Ana.Morales@example.com" } });
  w.addInvoice("1002");
  await w.run();
  check("a QuickBooks customer with the same email is reused, not duplicated", w.qbo.customers.size === 1 && [...w.qbo.invoices.values()][0].CustomerRef.value === "50");
  const rec = w.store.find("customer", "c-ana");
  check("the link is marked as somebody else's record", rec.sentFingerprint.startsWith(engine.LINKED_PREFIX));
  w.customers.set("c-ana", { ...w.customers.get("c-ana"), phone: "(801) 555-9999" });
  w.store.queue("customer", "c-ana");
  const before = w.qbo.calls.writes;
  await w.run();
  check("a linked customer is never edited when Altair's copy changes", w.qbo.calls.writes === before && w.qbo.customers.get("50").SyncToken === "3");
}
{
  const w = makeWorld({ qbo: { vendorNames: ["Bob Smith"] } });
  w.addInvoice("1003", { customerId: "c-bob" });
  await w.run();
  const names = [...w.qbo.customers.values()].map((c) => c.DisplayName);
  check("a name a vendor already has is sent as 'Name (City)'", names.includes("Bob Smith (Murray)"), names);
  check("and the invoice still goes", w.qbo.invoices.size === 1);
}
{
  const w = makeWorld();
  w.qbo.failNext("network", { on: "create:Invoice", afterWrite: true });
  w.addInvoice("1004");
  const first = await w.run();
  check("an answer lost after the write leaves the invoice waiting", w.store.find("invoice", "1004").state === "pending" && first.retried === 1, first);
  w.advance(10);
  await w.run();
  check("the retry is answered from QuickBooks' memory: still one invoice", w.qbo.invoices.size === 1 && w.store.find("invoice", "1004").state === "sent");
}
{
  const w = makeWorld();
  w.qbo.customers.set("60", { Id: "60", SyncToken: "0", DisplayName: "Ana Morales" });
  w.qbo.invoices.set("61", { Id: "61", SyncToken: "0", DocNumber: "INV-1005", TotalAmt: 2812.63, TotalTax: 177.63, Balance: 2812.63, CustomerRef: { value: "60" }, Line: [] });
  w.addInvoice("1005");
  await w.run();
  check("an invoice QuickBooks already has under Altair's number is linked, not copied", w.qbo.invoices.size === 1 && w.store.find("invoice", "1005").remoteId === "61");
}

// ============================== 3. edits and voids ==============================

section("3. Edits, stale SyncTokens and voids");
{
  const w = makeWorld();
  const inv = w.addInvoice("1010");
  await w.run();
  const qInv = [...w.qbo.invoices.values()][0];
  qInv.SyncToken = "7"; // somebody touched it in QuickBooks
  w.invoices.set("1010", { ...inv, notes: "Customer asked for an itemised copy." });
  w.store.queue("invoice", "1010");
  await w.run();
  check("an edit is sent as an update to the same QuickBooks invoice", w.qbo.invoices.size === 1 && qInv.CustomerMemo?.value === "Customer asked for an itemised copy.");
  check("a stale SyncToken is re-read once and the update goes through", w.store.find("invoice", "1010").state === "sent" && qInv.SyncToken === "8");
  w.invoices.set("1010", { ...w.invoices.get("1010"), status: "void" });
  w.store.queue("invoice", "1010");
  await w.run();
  check("a voided invoice is voided in QuickBooks", qInv.Voided === true && w.store.find("invoice", "1010").sentFingerprint === engine.VOIDED_FINGERPRINT);
}
{
  const w = makeWorld();
  w.addInvoice("1011");
  w.addPayment("p11", "1011", 500);
  await w.run();
  w.invoices.set("1011", { ...w.invoices.get("1011"), status: "void" });
  w.store.queue("invoice", "1011");
  await w.run();
  const rec = w.store.find("invoice", "1011");
  check("voiding an invoice QuickBooks has a payment on waits for a person", rec.state === "attention" && rec.attentionCode === "void_has_payments", rec);
  check("QuickBooks' error text is never kept, only its number", JSON.stringify(rec.attentionDetail).includes("6430") && !JSON.stringify(rec).includes("SECRET-ECHO"), rec.attentionDetail);
}
{
  const w = makeWorld();
  w.addInvoice("1012", { status: "draft" });
  await w.run();
  check("an invoice back in draft is let go, not sent", w.qbo.invoices.size === 0 && !w.store.find("invoice", "1012"));
}

// ============================== 4. money ==============================

section("4. Sales tax and payments: never changed quietly");
{
  const w = makeWorld({ qbo: { astRate: 0.0705 } });
  const inv = w.addInvoice("1020");
  await w.run();
  const rec = w.store.find("invoice", "1020");
  check("QuickBooks working out different tax puts the invoice on the attention list", rec.state === "attention" && rec.attentionCode === "total_mismatch", rec);
  check("with both totals, both taxes and the job address", rec.attentionDetail.altairTotal === inv.total && rec.attentionDetail.quickbooksTotal === round(2450 * 1.0705 + 185) && rec.attentionDetail.altairTax === inv.taxAmount && rec.attentionDetail.address === "3462 S 3200 W, West Valley City", rec.attentionDetail);
  check("the QuickBooks id is kept, so it is not created again", rec.remoteId !== null);
  w.qbo.astRate = null;
  w.store.queue("invoice", "1020");
  await w.run();
  check("'Try again' writes and compares again (and clears it once they agree)", w.qbo.invoices.size === 1 && w.store.find("invoice", "1020").state === "sent");
}
{
  const w = makeWorld({ settings: { taxMode: "none" } });
  w.addInvoice("1021");
  await w.run();
  const rec = w.store.find("invoice", "1021");
  check("tax on an invoice while sales tax is off in QuickBooks is flagged", rec.attentionCode === "tax_off_in_quickbooks" && rec.remoteId !== null, rec);
  check("and no TAX/NON codes are sent to a company without sales tax", [...w.qbo.invoices.values()][0].Line.every((l) => !l.SalesItemLineDetail.TaxCodeRef));
}
{
  const w = makeWorld();
  const inv = w.addInvoice("1022");
  await w.run();
  [...w.qbo.invoices.values()][0].Balance = 0; // the bookkeeper recorded it by hand
  w.addPayment("p22", "1022", inv.total);
  await w.run();
  const rec = w.store.find("payment", "p22");
  check("a payment QuickBooks already has by hand is not sent again", w.qbo.payments.size === 0 && rec.attentionCode === "invoice_already_paid", rec);
}
{
  const w = makeWorld({ settings: { depositAccountRef: "35" } });
  w.addInvoice("1023");
  w.addPayment("p23", "1023", 100, "check");
  await w.run();
  check("a picked deposit account is used", [...w.qbo.payments.values()][0]?.DepositToAccountRef?.value === "35");
}
{
  const w = makeWorld();
  w.addInvoice("1024", {
    lines: [{ serviceItemId: null, name: "Diagnostic, after hours", description: null, quantity: 3, unitPrice: 33.33, taxable: false, lineTotal: 100 }],
    taxRate: 0,
  });
  await w.run();
  const line = [...w.qbo.invoices.values()][0]?.Line[0];
  check("a rounded line goes as one unit at the line total (QuickBooks would refuse 3 x 33.33 = 100.00)", line?.Amount === 100 && line?.SalesItemLineDetail.Qty === 1 && line?.SalesItemLineDetail.UnitPrice === 100, line);
  check("a hand-typed line goes as the general item", line?.SalesItemLineDetail.ItemRef.value === "900");
}
{
  const w = makeWorld({ settings: { customDocNumbers: false } });
  w.addInvoice("1025");
  await w.run();
  check("no DocNumber when QuickBooks numbers invoices itself", [...w.qbo.invoices.values()][0].DocNumber === undefined);
  const w2 = makeWorld();
  w2.addInvoice("1026", { number: "INV-2026-0000000000001" });
  await w2.run();
  check("no DocNumber when Altair's number is longer than 21 characters", [...w2.qbo.invoices.values()][0].DocNumber === undefined);
}

// ============================== 5. failures ==============================

section("5. When QuickBooks fails");
{
  const w = makeWorld();
  w.qbo.failNext("server", { on: "create:Invoice" });
  w.addInvoice("1030");
  await w.run();
  const rec = w.store.find("invoice", "1030");
  check("a QuickBooks error waits 5 minutes and counts the try", rec.state === "pending" && rec.attempts === 1 && rec.nextAttemptAt.getTime() === w.clock().getTime() + 5 * 60_000, rec);
  for (let i = 0; i < 10; i += 1) w.qbo.failNext("server", { on: "create:Invoice" });
  for (let i = 0; i < 10; i += 1) {
    w.advance(1500);
    await w.run();
  }
  check(`after ${engine.MAX_AUTOMATIC_ATTEMPTS} tries it waits for a person`, w.store.find("invoice", "1030").attentionCode === "quickbooks_unavailable");
}
{
  const w = makeWorld();
  w.addInvoice("1031");
  w.addInvoice("1032", { customerId: "c-bob" });
  w.qbo.failNext("rate_limit", { on: "create:Invoice" });
  const r = await w.run();
  check("'too many requests' stops the whole run and waits a minute", r.stoppedBecause === "rate_limit" && w.qbo.invoices.size === 0, r);
}
{
  const w = makeWorld();
  w.addInvoice("1033");
  w.qbo.failNext("auth", { on: "create:Customer" });
  const r = await w.run();
  check("refused keys stop the run (the owner must connect again)", r.stoppedBecause === "auth", r);
  check("and nothing is marked as failed because of it", w.store.records.every((x) => x.state === "pending"));
}
{
  const w = makeWorld();
  w.customers.set("c-bad", { id: "c-bad", name: "Rejected Rita", companyName: null, email: "", phone: "", address: { line1: "", line2: "", city: "", state: "", postalCode: "" } });
  w.qbo.failNext("rejected", { on: "create:Customer", code: "6000" });
  w.addInvoice("1034", { customerId: "c-bad" });
  w.addInvoice("1035");
  await w.run();
  check("an invoice whose customer QuickBooks refused waits, naming the customer", w.store.find("invoice", "1034").attentionCode === "customer_not_sent" && w.store.find("invoice", "1034").attentionDetail.blockedBy === "Rejected Rita");
  check("and the other invoices still go", w.store.find("invoice", "1035").state === "sent");
}
{
  const w = makeWorld();
  for (let i = 0; i < 5; i += 1) w.addInvoice(`10${40 + i}`);
  let ticks = 0;
  const r = await engine.runAccountingSync({ store: w.store, api: w.qbo, settings: w.settings, maxRecords: 100, deadline: new Date(w.clock().getTime() + 1), now: () => new Date(w.clock().getTime() + (ticks++ > 1 ? 10 : 0)) });
  check("a run stops starting new records at its deadline", r.stoppedBecause === "deadline" && w.store.records.some((x) => x.state === "pending"), r);
}

// ============================== 6. building blocks ==============================

section("6. Names, keys and error handling");
check("colons, tabs and newlines are removed from QuickBooks names", payloads.cleanQboName("Smith: Main\tSt\nUnit 2", 500) === "Smith Main St Unit 2");
check("item names are cut to 100 characters", payloads.itemName({ id: "x", name: "A".repeat(140), description: null, unitPrice: 1, taxable: false }).length === 100);
check("a suffixed name still fits", payloads.alternateItemNames({ id: "abcdef123", name: "B".repeat(120), description: null, unitPrice: 1, taxable: false })[0].length <= 100);
const rid = payloads.requestIdFor("11111111-2222-3333-4444-555555555555", "f".repeat(64));
check("idempotency keys are at most 50 characters and stable", rid.length === 50 && rid === payloads.requestIdFor("11111111-2222-3333-4444-555555555555", "f".repeat(64)));
check("a changed record gets a new idempotency key", rid !== payloads.requestIdFor("11111111-2222-3333-4444-555555555555", "e".repeat(64)));
check("fingerprints ignore key order", payloads.fingerprintBody({ a: 1, b: { c: 2, d: 3 } }) === payloads.fingerprintBody({ b: { d: 3, c: 2 }, a: 1 }));
const classified = errors.classifyQboFailure({ status: 400, body: { Fault: { Error: [{ code: "6240", Message: "Ana Morales already exists" }] } }, intuitTid: "t" });
check("a QuickBooks fault keeps its number and never its words", classified.kind === "duplicate_name" && classified.code === "6240" && !classified.message.includes("Ana"));
check("only digits count as an error number", errors.readFaultCodes({ Fault: { Error: [{ code: "6240" }, { code: "<script>" }] } }).join() === "6240");
check("429 asks for a wait, 401 means connect again", errors.classifyQboFailure({ status: 429, body: {}, intuitTid: null }).kind === "rate_limit" && errors.classifyQboFailure({ status: 401, body: {}, intuitTid: null }).kind === "auth");

// ============================== 7. boundaries ==============================

section("7. Boundaries");
const engineSource = readFileSync("lib/accounting/engine.ts", "utf8");
check("the engine imports no database, Supabase or Next module", !/from\s+["'](@\/lib\/database|@\/lib\/supabase|next\/|@supabase)/.test(engineSource));
const payloadSource = readFileSync("lib/accounting/quickbooks/payloads.ts", "utf8");
check("request bodies are built without the network or the database", !/from\s+["'](@\/lib\/database|@\/lib\/supabase|next\/)/.test(payloadSource) && !/fetch\(/.test(payloadSource));
const migration = readFileSync("supabase/migrations/222_quickbooks_online_connection.sql", "utf8");
check("the trigger function is security definer with a pinned search_path", /function public\.accounting_enqueue_on_change\(\)[\s\S]*?security definer\s+set search_path = public, pg_temp/.test(migration));
check("nobody can call the trigger function directly", ["public", "anon", "authenticated"].every((role) => migration.includes(`revoke all on function public.accounting_enqueue_on_change() from ${role};`)));
check("the key table has no policy and no grant to signed-in users", !/on public\.accounting_connection_secrets\s+for\s+(select|insert|update|delete|all)\b/.test(migration) && !/grant [^;]*on table public\.accounting_connection_secrets to [^;]*authenticated/.test(migration));

console.log(`\n${passed}/${passed + failedCount} checks passed`);
if (failedCount > 0) process.exit(1);
