/**
 * Reads the file an owner drops on an import screen and hands back CSV text,
 * whether it was a .csv or an Excel .xlsx file.
 *
 * ============ WHY ============
 * ServiceTitan, FieldEdge, Service Fusion and QuickBooks export Excel files,
 * not CSV (vendor help pages, checked 2026-11-26). Asking a switching owner to
 * open each file and "Save As CSV" is the step where people give up, so the
 * import screens accept the .xlsx itself. The rest of the import pipeline
 * keeps working on CSV text, so nothing downstream changes.
 *
 * ============ HOW ============
 * An .xlsx file is a zip of XML files. The browser already has everything
 * needed to read one: DecompressionStream("deflate-raw") for the zip entries
 * and DOMParser for the XML. No library is shipped. Customer imports read the
 * first sheet; the price book import offers each sheet. Cells keep their text, numbers stay as written, and cells formatted as
 * dates come back as YYYY-MM-DD.
 *
 * Browser-only (DOMParser). Old binary .xls files are not supported and get a
 * plain "save it as .xlsx or .csv" message.
 */

export const SPREADSHEET_FILE_ACCEPT =
  ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type SpreadsheetReadResult = { text: string; error?: undefined } | { text?: undefined; error: string };

/* ================================================================ CSV out */

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serialises rows to CSV text the import parser reads back unchanged. */
export function recordsToCsv(records: readonly (readonly string[])[]): string {
  return records.map((record) => record.map(csvCell).join(",")).join("\n");
}

/* ================================================================ zip */

type ZipEntry = { method: number; compressedSize: number; localOffset: number };

function readZipDirectory(bytes: Uint8Array): Map<string, ZipEntry> | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory: signature 0x06054b50, within the last 64 KB.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder();

  for (let n = 0; n < count; n += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) return null;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name.replace(/^\//, ""), { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const data = bytes.slice(start, start + entry.compressedSize);

  if (entry.method === 0) return new TextDecoder().decode(data);
  if (entry.method !== 8) throw new Error(`Unsupported zip compression ${entry.method}`);

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

/* ================================================================ xlsx */

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/** Elements by local name, whatever namespace prefix the writer used. */
function byName(node: Document | Element, localName: string): Element[] {
  return Array.from(node.getElementsByTagNameNS("*", localName));
}

function columnIndex(cellRef: string): number {
  const letters = cellRef.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

/** Built-in Excel number formats that display a date. */
const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

function dateStyleIndexes(stylesXml: string | null): Set<number> {
  const dateStyles = new Set<number>();
  if (!stylesXml) return dateStyles;
  const doc = parseXml(stylesXml);
  const customDateFormats = new Set<number>();
  for (const format of byName(doc, "numFmt")) {
    const code = (format.getAttribute("formatCode") ?? "").replace(/"[^"]*"|\[[^\]]*\]/g, "");
    if (/[dy]/i.test(code)) customDateFormats.add(Number(format.getAttribute("numFmtId")));
  }
  const cellXfs = byName(doc, "cellXfs")[0];
  if (!cellXfs) return dateStyles;
  Array.from(cellXfs.children).forEach((xf, index) => {
    const id = Number(xf.getAttribute("numFmtId") ?? 0);
    if (BUILT_IN_DATE_FORMATS.has(id) || customDateFormats.has(id)) dateStyles.add(index);
  });
  return dateStyles;
}

function excelSerialToIsoDate(serial: number): string {
  // Excel's day 0 is 1899-12-30 once its 1900 leap-year bug is accounted for.
  const ms = Math.round((serial - 25569) * 86_400_000);
  return new Date(ms).toISOString().slice(0, 10);
}

function resolveTarget(target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  return `xl/${target}`.replace(/\/\.\//g, "/");
}

type SheetRef = { name: string; path: string };

async function readXlsxSheets(bytes: Uint8Array): Promise<{ name: string; records: string[][] }[]> {
  const entries = readZipDirectory(bytes);
  if (!entries) throw new Error("not a zip");

  const read = async (name: string) => {
    const entry = entries.get(name);
    return entry ? readZipEntry(bytes, entry) : null;
  };

  // Sheets in workbook order, through the workbook's relationship list.
  const sheets: SheetRef[] = [];
  const workbookXml = await read("xl/workbook.xml");
  const relsXml = await read("xl/_rels/workbook.xml.rels");
  if (workbookXml && relsXml) {
    const rels = byName(parseXml(relsXml), "Relationship");
    for (const sheet of byName(parseXml(workbookXml), "sheet")) {
      const relId =
        sheet.getAttributeNS(
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "id",
        ) || sheet.getAttribute("r:id");
      const target = rels.find((node) => node.getAttribute("Id") === relId)?.getAttribute("Target");
      if (target && entries.has(resolveTarget(target))) {
        sheets.push({ name: sheet.getAttribute("name") ?? `Sheet ${sheets.length + 1}`, path: resolveTarget(target) });
      }
    }
  }
  if (sheets.length === 0 && entries.has("xl/worksheets/sheet1.xml")) {
    sheets.push({ name: "Sheet1", path: "xl/worksheets/sheet1.xml" });
  }
  if (sheets.length === 0) throw new Error("no sheet");

  const sharedXml = await read("xl/sharedStrings.xml");
  const sharedStrings = sharedXml
    ? byName(parseXml(sharedXml), "si").map((si) =>
        byName(si, "t")
          .filter((t) => t.parentElement?.localName !== "rPh") // skip phonetic hints
          .map((t) => t.textContent ?? "")
          .join(""),
      )
    : [];
  const dateStyles = dateStyleIndexes(await read("xl/styles.xml"));

  const result: { name: string; records: string[][] }[] = [];
  for (const sheet of sheets) {
    const sheetXml = await read(sheet.path);
    if (!sheetXml) continue;
    result.push({
      name: sheet.name,
      records: readSheetRecords(sheetXml, sharedStrings, dateStyles),
    });
  }
  return result;
}

function readSheetRecords(
  sheetXml: string,
  sharedStrings: string[],
  dateStyles: Set<number>,
): string[][] {
  const records: string[][] = [];
  for (const row of byName(parseXml(sheetXml), "row")) {
    const rowIndex = Number(row.getAttribute("r") ?? records.length + 1) - 1;
    const record: string[] = [];
    let nextColumn = 0;
    for (const cell of Array.from(row.children).filter((node) => node.localName === "c")) {
      const ref = cell.getAttribute("r");
      const column = ref ? columnIndex(ref) : nextColumn;
      nextColumn = column + 1;
      const type = cell.getAttribute("t");
      const raw = byName(cell, "v")[0]?.textContent ?? "";
      let value: string;
      if (type === "s") value = sharedStrings[Number(raw)] ?? "";
      else if (type === "inlineStr") value = byName(cell, "t").map((t) => t.textContent ?? "").join("");
      else if (type === "b") value = raw === "1" ? "TRUE" : raw === "0" ? "FALSE" : "";
      else if (type === "str" || type === "e") value = type === "e" ? "" : raw;
      else if (raw && dateStyles.has(Number(cell.getAttribute("s") ?? -1)) && Number.isFinite(Number(raw))) {
        value = excelSerialToIsoDate(Number(raw));
      } else value = raw;
      while (record.length < column) record.push("");
      record[column] = value.trim();
    }
    while (records.length < rowIndex) records.push([]);
    records[rowIndex] = record;
  }

  // Report exports can open with a title line or two above the real header:
  // start at the first row with at least two filled cells.
  const firstHeader = records.findIndex(
    (record) => record.filter((value) => value.trim()).length >= 2,
  );
  const body = firstHeader < 0 ? [] : records.slice(firstHeader);
  const width = Math.max(0, ...body.map((record) => record.length));
  return body
    .filter((record) => record.some((value) => value.trim()))
    .map((record) => Array.from({ length: width }, (_, i) => record[i] ?? ""));
}

/* ================================================================ entry point */

function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function isOldExcel(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

export type SpreadsheetSheet = { name: string; text: string };

/** Reads a dropped .csv or .xlsx file and returns its first sheet as CSV text. */
export async function readSpreadsheetFileAsCsv(file: File): Promise<SpreadsheetReadResult> {
  const read = await readSpreadsheetFileSheets(file);
  if (read.error !== undefined) return { error: read.error };
  return { text: read.sheets[0]!.text };
}

/**
 * Reads a dropped .csv or .xlsx file and returns every non-empty sheet as CSV
 * text (a CSV file is one sheet). A ServiceTitan price book export, for
 * example, puts services and materials on separate sheets.
 */
export async function readSpreadsheetFileSheets(
  file: File,
): Promise<{ sheets: SpreadsheetSheet[]; error?: undefined } | { sheets?: undefined; error: string }> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { error: "Could not read this file. Try again." };
  }

  if (isOldExcel(bytes) || /\.xls$/i.test(file.name)) {
    return {
      error:
        "This is an older Excel (.xls) file. Open it in Excel or Google Sheets and save it as .xlsx or .csv, then upload it again.",
    };
  }

  if (isZip(bytes) || /\.xlsx$/i.test(file.name)) {
    try {
      const sheets = (await readXlsxSheets(bytes))
        .filter((sheet) => sheet.records.length > 0)
        .map((sheet) => ({ name: sheet.name, text: recordsToCsv(sheet.records) }));
      if (sheets.length === 0) return { error: "This Excel file has no rows in it." };
      return { sheets };
    } catch {
      return {
        error:
          "Could not read this Excel file. Open it in Excel or Google Sheets, save it as .csv, and upload that instead.",
      };
    }
  }

  return { sheets: [{ name: file.name, text: new TextDecoder("utf-8").decode(bytes) }] };
}
