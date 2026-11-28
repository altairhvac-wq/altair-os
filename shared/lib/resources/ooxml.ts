/**
 * A small writer for the two Office file types the templates download as:
 * .xlsx (Excel, Google Sheets, Numbers) and .docx (Word, Google Docs, Pages).
 *
 * ============ WHY NOT A LIBRARY ============
 * The templates are fixed content built at build time, and they need only a
 * handful of features: text, numbers, formulas with their results, a few
 * cell styles, headings, bullets, check boxes and write-in lines. Both
 * formats are a zip of XML files, so a stored (uncompressed) zip and the XML
 * below cover it with no dependency and nothing shipped to the browser.
 *
 * Pure: no imports, so the verifier can load it and open what it writes.
 */

/* ================================================================ zip */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** A zip with every entry stored (no compression), dated 2026-11-21. */
export function zipStored(files: readonly { readonly name: string; readonly data: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (11 << 5) | 21;
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // names are UTF-8
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, DOS_TIME, true);
    lv.setUint16(12, DOS_DATE, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, DOS_TIME, true);
    cv.setUint16(14, DOS_DATE, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const out = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/* =============================================================== xlsx */

/** Cell styles, by index into styles.xml's cellXfs. */
export const XS = {
  normal: 0,
  bold: 1,
  title: 2,
  header: 3,
  money: 4,
  percent: 5,
  inputMoney: 6,
  inputPercent: 7,
  inputNumber: 8,
  note: 9,
  totalMoney: 10,
  wrap: 11,
  number: 12,
  inputText: 13,
  label: 14,
  section: 15,
} as const;

export type XlsxCell = {
  /** Text, a number, or null for an empty (but maybe styled) cell. */
  readonly v?: string | number | null;
  /** A formula without the leading "=". `v` is its cached result. */
  readonly f?: string;
  readonly s?: number;
};

export type XlsxSheet = {
  readonly name: string;
  /** Column widths in characters, from column A. */
  readonly widths: readonly number[];
  /** Rows from row 1; each row lists cells from column A (null skips a cell). */
  readonly rows: readonly (readonly (XlsxCell | null)[])[];
  /** Ranges such as "A1:G1". */
  readonly merges?: readonly string[];
  /** Taller rows: row number (1-based) to height in points. */
  readonly heights?: Readonly<Record<number, number>>;
};

export function colName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function cellXml(ref: string, cell: XlsxCell): string {
  const s = cell.s ? ` s="${cell.s}"` : "";
  if (cell.f !== undefined) {
    const formula = `<f>${escapeXml(cell.f)}</f>`;
    if (typeof cell.v === "number" && Number.isFinite(cell.v)) return `<c r="${ref}"${s}>${formula}<v>${cell.v}</v></c>`;
    return `<c r="${ref}"${s} t="str">${formula}<v>${escapeXml(typeof cell.v === "string" ? cell.v : "")}</v></c>`;
  }
  if (typeof cell.v === "number" && Number.isFinite(cell.v)) return `<c r="${ref}"${s}><v>${cell.v}</v></c>`;
  if (typeof cell.v === "string" && cell.v !== "") {
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.v)}</t></is></c>`;
  }
  return s ? `<c r="${ref}"${s}/>` : "";
}

const XLSX_STYLES = `${XML_HEAD}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>
<fonts count="6">
<font><sz val="11"/><color rgb="FF1C1917"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF1C1917"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="18"/><color rgb="FF0A0A0A"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FF57534E"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="9"/><color rgb="FF78716C"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FF77591B"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF5F5F4"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFBF3DF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFD6D3D1"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FFC2A05A"/></left><right style="thin"><color rgb="FFC2A05A"/></right><top style="thin"><color rgb="FFC2A05A"/></top><bottom style="thin"><color rgb="FFC2A05A"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="16">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyProtection="1"><alignment vertical="center"/><protection locked="0"/></xf>
<xf numFmtId="165" fontId="0" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyProtection="1"><alignment vertical="center"/><protection locked="0"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyProtection="1"><alignment vertical="center"/><protection locked="0"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="2" xfId="0" applyFill="1" applyBorder="1" applyProtection="1"><alignment vertical="top" wrapText="1"/><protection locked="0"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function sheetXml(sheet: XlsxSheet): string {
  const cols = sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  const rows = sheet.rows
    .map((row, r) => {
      const n = r + 1;
      const cells = row.map((cell, c) => (cell ? cellXml(`${colName(c)}${n}`, cell) : "")).join("");
      const height = sheet.heights?.[n];
      const ht = height ? ` ht="${height}" customHeight="1"` : "";
      return cells || ht ? `<row r="${n}"${ht}>${cells}</row>` : "";
    })
    .join("");
  const merges = sheet.merges && sheet.merges.length > 0 ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
  return `${XML_HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${cols}</cols>
<sheetData>${rows}</sheetData>${merges}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

export function buildXlsx(sheets: readonly XlsxSheet[], title: string): Uint8Array {
  const sheetEntries = sheets.map((sheet, i) => `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  const rels = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("");
  return zipStored([
    {
      name: "[Content_Types].xml",
      data: `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    },
    { name: "docProps/core.xml", data: coreXml(title) },
    {
      name: "xl/workbook.xml",
      data: `${XML_HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "xl/styles.xml", data: XLSX_STYLES },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(sheet) })),
  ]);
}

function coreXml(title: string): string {
  return `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Altair Operating System</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2026-11-21T00:00:00Z</dcterms:created></cp:coreProperties>`;
}

/* =============================================================== docx */

export type DocxBlock =
  | { readonly kind: "title"; readonly text: string }
  | { readonly kind: "subtitle"; readonly text: string }
  | { readonly kind: "heading"; readonly text: string }
  | { readonly kind: "subheading"; readonly text: string }
  | { readonly kind: "para"; readonly text: string; readonly bold?: boolean }
  | { readonly kind: "note"; readonly text: string }
  | { readonly kind: "bullet"; readonly text: string }
  | { readonly kind: "check"; readonly text: string; readonly checked?: boolean; readonly detail?: string }
  | { readonly kind: "field"; readonly label: string; readonly value?: string }
  | { readonly kind: "line" }
  | { readonly kind: "callout"; readonly text: string };

const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function run(text: string, props = ""): string {
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function blockXml(block: DocxBlock): string {
  switch (block.kind) {
    case "title":
      return `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${run(block.text)}</w:p>`;
    case "subtitle":
      return `<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr>${run(block.text)}</w:p>`;
    case "heading":
      return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${run(block.text)}</w:p>`;
    case "subheading":
      return `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>${run(block.text)}</w:p>`;
    case "para":
      return `<w:p>${run(block.text, block.bold ? "<w:b/>" : "")}</w:p>`;
    case "note":
      return `<w:p><w:pPr><w:pStyle w:val="Note"/></w:pPr>${run(block.text)}</w:p>`;
    case "bullet":
      return `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="360"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr>${run("•", '<w:color w:val="A4823A"/>')}${run("\t")}${run(block.text)}</w:p>`;
    case "check":
      return `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="400"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="400" w:hanging="400"/></w:pPr>${run(
        block.checked ? "☑" : "☐",
        '<w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol"/><w:sz w:val="24"/>',
      )}${run("\t")}${run(block.text)}${block.detail ? run(`  ${block.detail}`, '<w:i/><w:color w:val="77591B"/>') : ""}</w:p>`;
    case "field":
      return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="A8A29E"/></w:pBdr><w:spacing w:before="160" w:after="40"/></w:pPr>${run(`${block.label}: `, '<w:b/><w:color w:val="57534E"/><w:sz w:val="20"/>')}${block.value ? run(block.value) : ""}</w:p>`;
    case "line":
      return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="A8A29E"/></w:pBdr><w:spacing w:before="200" w:after="0"/></w:pPr></w:p>`;
    case "callout":
      return `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="C2A05A"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="FBF3DF"/><w:spacing w:before="120" w:after="200"/><w:ind w:left="200" w:right="200"/></w:pPr>${run(block.text, '<w:sz w:val="20"/>')}</w:p>`;
  }
}

const DOCX_STYLES = `${XML_HEAD}<w:styles ${W_NS}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:color w:val="1C1917"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:color w:val="0A0A0A"/><w:sz w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:caps/><w:color w:val="77591B"/><w:spacing w:val="20"/><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="3" w:color="C2A05A"/></w:pBdr><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="0A0A0A"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="44403C"/><w:sz w:val="23"/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Note"><w:name w:val="Note"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:i/><w:color w:val="78716C"/><w:sz w:val="18"/></w:rPr></w:style>
</w:styles>`;

export function buildDocx(blocks: readonly DocxBlock[], title: string): Uint8Array {
  const body = blocks.map(blockXml).join("");
  return zipStored([
    {
      name: "[Content_Types].xml",
      data: `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    },
    { name: "docProps/core.xml", data: coreXml(title) },
    {
      name: "word/_rels/document.xml.rels",
      data: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "word/styles.xml", data: DOCX_STYLES },
    {
      name: "word/document.xml",
      data: `${XML_HEAD}<w:document ${W_NS}><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="540" w:footer="540" w:gutter="0"/></w:sectPr></w:body></w:document>`,
    },
  ]);
}
