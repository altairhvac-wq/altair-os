function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function parseCsvRecords(text: string): {
  records: string[][];
  error?: string;
} {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    return {
      records: [],
      error:
        "The CSV file has an unclosed quote. Fix the formatting and try again.",
    };
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return { records };
}

export function normalizeCsvHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export type ParsedCustomerImportCsv = {
  headers: string[];
  dataRecords: string[][];
};

export function parseCustomerImportCsvRaw(text: string): {
  error?: string;
  parsed?: ParsedCustomerImportCsv;
} {
  const trimmed = stripBom(text).trim();

  if (!trimmed) {
    return { error: "The file is empty. Add customer rows and try again." };
  }

  const parsedRecords = parseCsvRecords(trimmed);
  if (parsedRecords.error) {
    return { error: parsedRecords.error };
  }

  const records = parsedRecords.records.filter((record) =>
    record.some((value) => value.trim().length > 0),
  );

  if (records.length === 0) {
    return { error: "The file is empty. Add customer rows and try again." };
  }

  const headers = records[0]!.map((header) => header.trim());
  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );

  if (duplicateHeaders.length > 0) {
    const uniqueDuplicates = [...new Set(duplicateHeaders)];
    return {
      error: `The CSV has duplicate column names (${uniqueDuplicates.join(", ")}). Rename columns and try again.`,
    };
  }

  const dataRecords = records.slice(1).filter((record) =>
    record.some((value) => value.trim().length > 0),
  );

  if (headers.every((header) => header.length === 0)) {
    return { error: "The CSV header row is missing. Add column names and try again." };
  }

  if (dataRecords.length === 0) {
    return {
      error: "No customer rows were found. Add at least one row below the header.",
    };
  }

  return {
    parsed: {
      headers,
      dataRecords,
    },
  };
}

export function getValueForHeader(
  record: string[],
  headers: string[],
  headerName: string | null,
): string {
  if (!headerName) {
    return "";
  }

  const columnIndex = headers.indexOf(headerName);
  if (columnIndex < 0) {
    return "";
  }

  return (record[columnIndex] ?? "").trim();
}
