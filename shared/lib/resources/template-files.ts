/**
 * The editable template files: Excel for the two spreadsheets, Word for the
 * two documents, each blank and as a filled-in HVAC example. Built from the
 * content in templates.ts by the small writer in ooxml.ts, and served by
 * app/(marketing)/resources/templates/download/[file]/route.ts, which is
 * prerendered at build time.
 *
 * Pure: relative imports only.
 */
import { XS, buildDocx, buildXlsx, colName, type DocxBlock, type XlsxCell, type XlsxSheet } from "./ooxml";
import {
  AGREEMENT_CHECKLIST,
  AGREEMENT_DISCLAIMER,
  AGREEMENT_SECTIONS,
  CHECKLIST_SECTIONS,
  ESTIMATE_BLANK,
  ESTIMATE_EXAMPLE,
  ESTIMATE_TERMS_HINTS,
  RESOURCE_TEMPLATES,
  WORKSHEET_NOTES,
  WORKSHEET_ROWS,
  estimateTotals,
  pricingWorksheetExample,
  templateFileName,
  type EstimateDoc,
} from "./templates";

export type TemplateFileVariant = "blank" | "example";

export type TemplateFile = {
  /** The URL segment and the download name, e.g. "altair-estimate-template.xlsx". */
  readonly name: string;
  readonly templateId: string;
  readonly variant: TemplateFileVariant;
  readonly ext: "xlsx" | "docx";
  readonly contentType: string;
  readonly build: () => Uint8Array;
};

export const OFFICE_CONTENT_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

const SITE = "altair-op.com/resources/templates";

/* ------------------------------------------------------------ estimate */

function estimateSheet(doc: EstimateDoc, example: boolean): XlsxSheet {
  const rows: (XlsxCell | null)[][] = [];
  const merges: string[] = [];
  const heights: Record<number, number> = {};
  const add = (cells: (XlsxCell | null)[]) => {
    rows.push(cells);
    return rows.length;
  };
  const text = (v: string, s: number = XS.normal): XlsxCell => ({ v, s });

  const titleRow = add([text("Estimate", XS.title)]);
  heights[titleRow] = 30;
  add([
    text(
      example
        ? `Filled-in example. ${ESTIMATE_EXAMPLE.company[0].value} and every name, address and price here are samples.`
        : "Fill in the yellow cells. Line totals, subtotal, tax and total work themselves out.",
      XS.note,
    ),
  ]);
  merges.push(`A2:G2`);
  add([]);
  add([text("From", XS.section), text("", XS.section), text("", XS.section), null, text("Estimate", XS.section), text("", XS.section), text("", XS.section)]);
  doc.company.forEach((row, i) => {
    const n = add([
      text(row.label, XS.label),
      { v: row.value, s: XS.inputText },
      { v: null, s: XS.inputText },
      null,
      text(doc.details[i]?.label ?? "", XS.label),
      { v: doc.details[i]?.value ?? "", s: XS.inputText },
      { v: null, s: XS.inputText },
    ]);
    merges.push(`B${n}:C${n}`, `F${n}:G${n}`);
  });
  add([]);
  add([text("Customer", XS.section), ...Array.from({ length: 6 }, () => text("", XS.section))]);
  for (const row of doc.customer) {
    const n = add([text(row.label, XS.label), { v: row.value, s: XS.inputText }, ...Array.from({ length: 5 }, () => ({ v: null, s: XS.inputText }))]);
    merges.push(`B${n}:G${n}`);
  }
  add([]);
  add(["Section", "Item", "Description", "Qty", "Unit", "Unit price", "Line total"].map((h) => text(h, XS.header)));
  const lineCount = Math.max(8, doc.lines.length + 3);
  const firstLine = rows.length + 1;
  for (let i = 0; i < lineCount; i += 1) {
    const line = doc.lines[i];
    const n = rows.length + 1;
    const total = line && line.qty !== null && line.unitPrice !== null ? line.qty * line.unitPrice : "";
    add([
      { v: line?.section ?? "", s: XS.inputText },
      { v: line?.item ?? "", s: XS.inputText },
      { v: line?.description ?? "", s: XS.inputText },
      { v: line?.qty ?? null, s: XS.inputNumber },
      { v: line?.unit ?? "", s: XS.inputText },
      { v: line?.unitPrice ?? null, s: XS.inputMoney },
      { f: `IF(OR(D${n}="",F${n}=""),"",D${n}*F${n})`, v: total, s: XS.money },
    ]);
  }
  const lastLine = rows.length;
  const totals = estimateTotals(doc);
  add([]);
  const sub = add([null, null, null, null, text("Subtotal", XS.bold), null, { f: `SUM(G${firstLine}:G${lastLine})`, v: totals.subtotal, s: XS.money }]);
  const disc = add([null, null, null, null, text("Discount", XS.bold), null, { v: doc.discount, s: XS.inputMoney }]);
  const rate = add([null, null, null, null, text("Sales tax rate", XS.bold), text("your local rate", XS.note), { v: doc.taxRate, s: XS.inputPercent }]);
  const tax = add([null, null, null, null, text("Sales tax", XS.bold), null, { f: `IF(G${rate}="",0,(G${sub}-G${disc})*G${rate})`, v: totals.tax, s: XS.money }]);
  const totalRow = add([null, null, null, null, text("Total", XS.bold), null, { f: `G${sub}-G${disc}+G${tax}`, v: totals.total, s: XS.totalMoney }]);
  heights[totalRow] = 22;
  add([]);
  add([text("Terms", XS.section), ...Array.from({ length: 6 }, () => text("", XS.section))]);
  for (const term of doc.terms) {
    const n = add([text(term.label, XS.label), { v: term.text || ESTIMATE_TERMS_HINTS[term.label] || "", s: XS.inputText }, ...Array.from({ length: 5 }, () => ({ v: null, s: XS.inputText }))]);
    merges.push(`B${n}:G${n}`);
    heights[n] = 34;
  }
  add([]);
  const sign = add([text("Customer approval", XS.label), text("Signature", XS.note), { v: null, s: XS.wrap }, null, text("Date", XS.note), { v: null, s: XS.wrap }, { v: null, s: XS.wrap }]);
  heights[sign] = 30;
  add([]);
  const n1 = add([text("This is a template, not a contract. Have your own terms reviewed by an attorney in your state.", XS.note)]);
  const n2 = add([text(`Example prices are placeholders, not industry figures. Free template from ${SITE}.`, XS.note)]);
  merges.push(`A${n1}:G${n1}`, `A${n2}:G${n2}`);

  return { name: example ? "Estimate example" : "Estimate", widths: [16, 20, 40, 8, 13, 13, 14], rows, merges, heights };
}

/* --------------------------------------------------- pricing worksheet */

function worksheetSheet(example: boolean): XlsxSheet {
  const ex = pricingWorksheetExample();
  const rows: (XlsxCell | null)[][] = [];
  const merges: string[] = [];
  const add = (cells: (XlsxCell | null)[]) => {
    rows.push(cells);
    return rows.length;
  };
  add([{ v: "Pricing worksheet", s: XS.title }]);
  add([
    {
      v: example
        ? "Filled-in example: the condenser fan motor repair from the estimate example (3 hours, $213 of parts). Sample numbers."
        : "Fill the yellow cells in Your numbers. Every other line works itself out. The Example column shows a finished calculation.",
      s: XS.note,
    },
  ]);
  merges.push("A2:E2");
  add([]);
  add(["Step", "Line", "Your numbers", "Example", "How it is worked out"].map((v) => ({ v, s: XS.header })));
  const first = rows.length + 1;
  const rowOf = new Map(WORKSHEET_ROWS.map((row, i) => [row.key, first + i]));
  const formulaFor = (formula: string, col: string) => formula.replace(/\{(\w+)\}/g, (_, key: string) => `${col}${rowOf.get(key as never)}`);
  const optional = new Set(WORKSHEET_ROWS.filter((row) => row.optional).map((row) => row.key as string));
  // Empty optional inputs (markup, other direct costs) count as 0, so they never hold the price back.
  const refsIn = (formula: string, col: string) =>
    [...formula.matchAll(/\{(\w+)\}/g)].filter((m) => !optional.has(m[1])).map((m) => `${col}${rowOf.get(m[1] as never)}`);

  for (const row of WORKSHEET_ROWS) {
    const value = ex[row.key];
    const inputStyle = row.unit === "$" ? XS.inputMoney : row.unit === "%" ? XS.inputPercent : XS.inputNumber;
    const outStyle = row.unit === "$" ? XS.money : row.unit === "%" ? XS.percent : XS.number;
    let yours: XlsxCell;
    let sample: XlsxCell;
    if (row.input) {
      yours = { v: example ? value : null, s: inputStyle };
      sample = { v: value, s: outStyle };
    } else {
      const formula = row.formula ?? "";
      const refs = Array.from(new Set(refsIn(formula, "C")));
      const expression = formulaFor(formula, "C");
      yours = {
        f: refs.length > 0 ? `IF(OR(${refs.map((r) => `${r}=""`).join(",")}),"",${expression})` : expression,
        v: example ? value : "",
        s: outStyle,
      };
      sample = { f: formulaFor(formula, "D"), v: value, s: outStyle };
    }
    add([{ v: row.step, s: XS.label }, { v: row.line, s: row.key === "price" ? XS.bold : XS.normal }, yours, sample, { v: row.how ?? "", s: XS.note }]);
  }
  add([]);
  for (const note of WORKSHEET_NOTES) {
    const n = add([{ v: note, s: XS.note }]);
    merges.push(`A${n}:E${n}`);
  }
  const n = add([{ v: `Free template from ${SITE}.`, s: XS.note }]);
  merges.push(`A${n}:E${n}`);
  return { name: example ? "Worksheet example" : "Pricing worksheet", widths: [20, 44, 15, 15, 34], rows, merges, heights: { 1: 30 } };
}

/* ---------------------------------------------------------- documents */

function agreementBlocks(example: boolean): DocxBlock[] {
  const blocks: DocxBlock[] = [
    { kind: "title", text: example ? "Maintenance agreement outline: filled-in example" : "Maintenance agreement outline" },
    { kind: "subtitle", text: example ? "Sample two-visit HVAC plan · not a contract" : "Free template · Altair Operating System" },
    { kind: "callout", text: AGREEMENT_DISCLAIMER },
  ];
  if (example) {
    blocks.push({ kind: "note", text: "The business, customer, prices and terms below are made up to show how a finished outline reads. Replace every one with your own." });
  }
  AGREEMENT_SECTIONS.forEach((section, index) => {
    blocks.push({ kind: "heading", text: `${index + 1}. ${section.title}` });
    if (example) {
      for (const answer of section.example) blocks.push({ kind: "bullet", text: answer });
    } else {
      blocks.push({ kind: "note", text: "What this section has to decide:" });
      for (const item of section.decide) blocks.push({ kind: "bullet", text: item });
      blocks.push({ kind: "field", label: "Our answer" }, { kind: "line" }, { kind: "line" });
    }
  });
  blocks.push({ kind: "heading", text: "Before you use your version" });
  for (const item of AGREEMENT_CHECKLIST) blocks.push({ kind: "check", text: item });
  blocks.push({ kind: "note", text: `Free template from ${SITE}.` });
  return blocks;
}

function checklistBlocks(example: boolean): DocxBlock[] {
  const blocks: DocxBlock[] = [
    { kind: "title", text: example ? "Daily operations checklist: filled-in example" : "Daily operations checklist" },
    { kind: "subtitle", text: example ? "One made-up day at a three-truck shop" : "Free template · Altair Operating System" },
    {
      kind: "para",
      text: "A routine for a small field service office. Adapt the times to your shop; keep the order. Items marked (owner) are the ones that most often slip when the owner is also working in the field.",
    },
    { kind: "field", label: "Date", value: example ? "Tuesday, November 17, 2026 (sample day)" : undefined },
    { kind: "field", label: "Completed by", value: example ? "Office manager (sample)" : undefined },
  ];
  for (const section of CHECKLIST_SECTIONS) {
    blocks.push({ kind: "heading", text: section.title });
    for (const item of section.items) {
      blocks.push({
        kind: "check",
        text: `${item.owner ? "(owner) " : ""}${item.text}`,
        checked: example && item.example !== undefined,
        detail: example ? item.example : undefined,
      });
    }
  }
  blocks.push({ kind: "note", text: `This is a starting point, not a rule book. Remove what does not apply and add what you keep forgetting. Free template from ${SITE}.` });
  return blocks;
}

/* --------------------------------------------------------------- list */

const BUILDERS: Record<string, (example: boolean, title: string) => Uint8Array> = {
  "estimate-template": (example, title) => buildXlsx([estimateSheet(example ? ESTIMATE_EXAMPLE : ESTIMATE_BLANK, example)], title),
  "pricing-worksheet": (example, title) => buildXlsx([worksheetSheet(example)], title),
  "maintenance-agreement-outline": (example, title) => buildDocx(agreementBlocks(example), title),
  "daily-operations-checklist": (example, title) => buildDocx(checklistBlocks(example), title),
};

export const TEMPLATE_FILES: readonly TemplateFile[] = RESOURCE_TEMPLATES.flatMap((template) =>
  (["blank", "example"] as const).map((variant) => ({
    name: templateFileName(template, variant),
    templateId: template.id,
    variant,
    ext: template.editable,
    contentType: OFFICE_CONTENT_TYPES[template.editable],
    build: () => BUILDERS[template.id](variant === "example", variant === "example" ? `${template.title}: filled-in example` : template.title),
  })),
);

export function findTemplateFile(name: string): TemplateFile | null {
  return TEMPLATE_FILES.find((file) => file.name === name) ?? null;
}

/** Column letter helper, re-exported for the verifier. */
export { colName };
