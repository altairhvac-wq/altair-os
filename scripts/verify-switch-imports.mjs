/**
 * Checks the pure logic behind the switching imports (2026-11-26):
 * price book rows, unpaid invoice rows, customer batches, and the /switch
 * page content.
 *
 * Altair has no test runner (AGENTS.md), so this follows the repository's
 * convention: plain node, the `typescript` devDependency transpiles the
 * modules under test into a temp folder, and `@/` imports between them are
 * rewritten to the transpiled siblings. Offline, no side effects.
 *
 * Run: node scripts/verify-switch-imports.mjs
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const MODULES = {
  "customer-import-parser": "shared/lib/customer-import-parser.ts",
  "price-book-import": "shared/lib/price-book-import.ts",
  "invoice-import": "shared/lib/invoice-import.ts",
  "switch-page": "shared/lib/site/switch-page.ts",
};

const dir = mkdtempSync(join(tmpdir(), "switch-imports-"));
for (const [name, file] of Object.entries(MODULES)) {
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const rewritten = outputText.replace(/from "@\/shared\/(?:lib|types)\/(?:site\/)?([a-z-]+)"/g, (whole, base) =>
    base in MODULES ? `from "./${base}.mjs"` : whole,
  );
  writeFileSync(join(dir, `${name}.mjs`), rewritten);
}
const load = (name) => import(pathToFileURL(join(dir, `${name}.mjs`)).href);
const pb = await load("price-book-import");
const inv = await load("invoice-import");
const sw = await load("switch-page");

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? ` (${detail})` : ""}`);
  }
}

console.log("money and dates");
check("$1,234.50", pb.parseImportMoney("$1,234.50") === 1234.5);
check("blank is null", pb.parseImportMoney("  ") === null);
check("words are NaN", Number.isNaN(pb.parseImportMoney("call for price")));
check("(12.00) is negative", pb.parseImportMoney("(12.00)") === -12);
check("ISO date", inv.parseImportDate("2026-10-02") === "2026-10-02");
check("US date", inv.parseImportDate("10/2/2026") === "2026-10-02");
check("month name", inv.parseImportDate("Oct 2, 2026") === "2026-10-02");
check("day month year", inv.parseImportDate("2 Oct 2026") === "2026-10-02");
check("impossible date is null", inv.parseImportDate("02/30/2026") === null);

console.log("price book");
{
  const headers = ["Name", "Price", "Cost", "Taxable", "Category"];
  const mapping = pb.suggestPriceBookImportMapping(headers, "housecall_pro");
  check("maps name and price", mapping.name === "Name" && mapping.unit_price === "Price");
  const rows = pb.buildPriceBookImportPreview(
    headers,
    [
      ["AC tune-up", "$149.00", "22", "false", "Cooling"],
      ["ac  TUNE-UP", "149", "", "", ""],
      ["Capacitor", "245", "", "yes", ""],
      ["Coil cleaning", "call", "", "", ""],
      ["", "10", "", "", ""],
      ["Filter", "24", "", "", ""],
    ],
    mapping,
    ["Filter"],
  );
  check("ready row", rows[0].status === "ready" && rows[0].row.unitPrice === 149 && rows[0].row.taxable === false);
  check("duplicate in file", rows[1].status === "duplicate");
  check("taxable yes", rows[2].row?.taxable === true);
  check("bad price is an error", rows[3].status === "error");
  check("no name is an error", rows[4].status === "error");
  check("existing name is a duplicate", rows[5].status === "duplicate");
}

console.log("unpaid invoices");
{
  const customers = [
    { id: "c1", name: "Maria Lopez", email: "maria@example.com", phone: "(435) 555-0100" },
    { id: "c2", name: "Sam Okafor", email: "", phone: "" },
    { id: "c3", name: "Sam Okafor", email: "", phone: "" },
  ];
  const index = inv.buildInvoiceImportCustomerIndex(customers);
  check("email match", inv.matchInvoiceImportCustomer(index, { name: "x", email: "MARIA@example.com", phone: "" }).customer?.id === "c1");
  check("phone match", inv.matchInvoiceImportCustomer(index, { name: "", email: "", phone: "435-555-0100" }).customer?.id === "c1");
  check("shared name is not guessed", !inv.matchInvoiceImportCustomer(index, { name: "Sam Okafor", email: "", phone: "" }).customer);

  const headers = ["Invoice #", "Client name", "Client email", "Due date", "Status", "Total ($)", "Balance ($)"];
  const mapping = inv.suggestInvoiceImportMapping(headers, "jobber");
  const rows = inv.buildInvoiceImportPreview(
    headers,
    [
      ["1041", "Maria Lopez", "maria@example.com", "11/01/2026", "Past due", "1,250.00", "1,250.00"],
      ["1042", "Maria Lopez", "maria@example.com", "12/01/2026", "Paid", "100.00", "0.00"],
      ["1043", "Nobody", "", "", "Awaiting payment", "50", "50"],
      ["1041", "Maria Lopez", "maria@example.com", "11/01/2026", "Past due", "1,250.00", "1,250.00"],
      ["0999", "Maria Lopez", "maria@example.com", "", "Awaiting payment", "80", "80"],
    ],
    mapping,
    index,
    ["0999"],
  );
  check("owed row ready", rows[0].status === "ready" && rows[0].row.amountOwed === 1250 && rows[0].row.customerId === "c1");
  check("zero balance skipped", rows[1].status === "skipped");
  check("unknown customer is an error", rows[2].status === "error");
  check("repeat in file skipped", rows[3].status === "skipped");
  check("already imported skipped", rows[4].status === "skipped");

  // QuickBooks Open Invoices: customer on its own row, then invoices, then a total row.
  const qbHeaders = ["Date", "Transaction type", "Num", "Due date", "Amount", "Open balance"];
  const qbMapping = inv.suggestInvoiceImportMapping(qbHeaders, "quickbooks");
  const qbRows = inv.buildInvoiceImportPreview(
    qbHeaders,
    [
      ["Maria Lopez", "", "", "", "", ""],
      ["10/02/2026", "Invoice", "2214", "11/01/2026", "1250", "1250"],
      ["Total for Maria Lopez", "", "", "", "1250", "1250"],
    ],
    qbMapping,
    index,
    [],
  );
  check("grouped report: one invoice row", qbRows.length === 1, String(qbRows.length));
  check("grouped report: customer from the group row", qbRows[0]?.row?.customerId === "c1");
  check("carried-over notes read back", inv.readPreviousInvoiceNumber(inv.describeCarriedOverInvoice(rows[0].row).notes) === "1041");
}

console.log("switch page content");
{
  const ids = new Set();
  for (const app of sw.SWITCH_APPS) {
    check(`${app.id}: unique id`, !ids.has(app.id));
    ids.add(app.id);
    check(`${app.id}: video under /marketing/switch/`, app.video.src.startsWith("/marketing/switch/") && app.video.poster.startsWith("/marketing/switch/"));
    check(`${app.id}: https sources`, app.sources.every((source) => source.href.startsWith("https://")));
    check(`${app.id}: export steps`, app.exportSteps.length > 0);
  }
  const text = JSON.stringify([sw.SWITCH_PAGE, sw.SWITCH_APPS, sw.SWITCH_FAQ]);
  check('never "Altair OS"', !/Altair OS\b/.test(text));
  check('never "free"', !/\bfree\b/i.test(text));
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll switch import checks passed");
process.exit(failures ? 1 : 0);
