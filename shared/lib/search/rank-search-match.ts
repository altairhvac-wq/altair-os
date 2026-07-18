import { tokenizeSearchQuery } from "@/shared/lib/search/tokenize-search-query";
import {
  compactSearchIdentifier,
  normalizeSearchField,
  normalizeSearchPhone,
} from "@/shared/lib/search/normalize-search-query";
import { parseDocumentReference } from "@/shared/lib/search/parse-document-reference";

export type SearchFieldKind =
  | "identifier"
  | "related_identifier"
  | "name"
  | "address"
  | "phone"
  | "email"
  | "status"
  | "text";

export type SearchField = {
  key: string;
  label: string;
  value: string | null | undefined;
  kind: SearchFieldKind;
};

export type SearchMatchRank =
  | "exact_stored"
  | "exact_normalized"
  | "exact_field"
  | "prefix"
  | "token"
  | "typo"
  | "substring";

export type RankedSearchMatch = {
  rank: SearchMatchRank;
  score: number;
  reason: string;
  fieldKey: string;
};

const RANK_SCORE: Record<SearchMatchRank, number> = {
  exact_stored: 1000,
  exact_normalized: 900,
  exact_field: 800,
  prefix: 700,
  token: 600,
  typo: 500,
  substring: 400,
};

const MIN_FUZZY_QUERY_LENGTH = 4;
const MAX_FUZZY_TOKEN_LENGTH = 24;
const MAX_EDIT_DISTANCE = 1;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0),
  );

  for (let i = 0; i < rows; i += 1) matrix[i]![0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0]![j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        (matrix[i - 1]![j] ?? 0) + 1,
        (matrix[i]![j - 1] ?? 0) + 1,
        (matrix[i - 1]![j - 1] ?? 0) + cost,
      );
    }
  }

  return matrix[a.length]![b.length] ?? Math.max(a.length, b.length);
}

function isIdentifierKind(kind: SearchFieldKind): boolean {
  return kind === "identifier" || kind === "related_identifier";
}

function reasonForField(field: SearchField, rank: SearchMatchRank): string {
  if (rank === "typo") {
    return `Close match for ${field.label.toLowerCase()}`;
  }

  if (field.kind === "related_identifier") {
    if (field.key.includes("job")) return "Matched job number";
    if (field.key.includes("estimate")) return "Matched estimate number";
    if (field.key.includes("invoice")) return "Matched invoice number";
    return `Matched ${field.label.toLowerCase()}`;
  }

  if (field.kind === "identifier") {
    return `Matched ${field.label.toLowerCase()}`;
  }

  if (field.kind === "address") return "Matched service address";
  if (field.kind === "phone") return "Matched phone";
  if (field.kind === "email") return "Matched email";
  if (field.kind === "name") return `Matched ${field.label.toLowerCase()}`;
  if (field.kind === "status") return "Matched status";
  return `Matched ${field.label.toLowerCase()}`;
}

function rankField(
  field: SearchField,
  query: ReturnType<typeof tokenizeSearchQuery>,
): RankedSearchMatch | null {
  const rawValue = (field.value ?? "").trim();
  if (!rawValue || !query.normalized) return null;

  const normalizedValue = normalizeSearchField(rawValue);
  const compactValue = compactSearchIdentifier(rawValue);

  if (isIdentifierKind(field.kind)) {
    if (rawValue.toLowerCase() === query.raw.toLowerCase()) {
      return {
        rank: "exact_stored",
        score: RANK_SCORE.exact_stored,
        reason: reasonForField(field, "exact_stored"),
        fieldKey: field.key,
      };
    }

    if (
      compactValue &&
      query.compact &&
      compactValue === query.compact
    ) {
      return {
        rank: "exact_normalized",
        score: RANK_SCORE.exact_normalized,
        reason: reasonForField(field, "exact_normalized"),
        fieldKey: field.key,
      };
    }

    const parsedQuery = parseDocumentReference(query.raw);
    if (
      parsedQuery.compact &&
      compactValue &&
      (compactValue === parsedQuery.compact ||
        (parsedQuery.jobCore &&
          compactValue.includes(
            compactSearchIdentifier(parsedQuery.jobCore),
          )))
    ) {
      // Prefer exact compact equality above; partial job-core hits as prefix/token.
      if (compactValue === parsedQuery.compact) {
        return {
          rank: "exact_normalized",
          score: RANK_SCORE.exact_normalized,
          reason: reasonForField(field, "exact_normalized"),
          fieldKey: field.key,
        };
      }
    }

    if (
      compactValue &&
      query.compact &&
      compactValue.startsWith(query.compact) &&
      query.compact.length >= 3
    ) {
      return {
        rank: "prefix",
        score: RANK_SCORE.prefix,
        reason: reasonForField(field, "prefix"),
        fieldKey: field.key,
      };
    }

    if (
      compactValue &&
      query.compact &&
      query.compact.length >= 3 &&
      compactValue.includes(query.compact)
    ) {
      return {
        rank: "substring",
        score: RANK_SCORE.substring + 50,
        reason: reasonForField(field, "substring"),
        fieldKey: field.key,
      };
    }
  }

  if (field.kind === "phone") {
    const queryDigits = normalizeSearchPhone(query.raw);
    const valueDigits = normalizeSearchPhone(rawValue);
    if (
      queryDigits.length >= 3 &&
      valueDigits &&
      valueDigits.includes(queryDigits)
    ) {
      return {
        rank: queryDigits.length >= 7 ? "exact_normalized" : "substring",
        score:
          queryDigits.length >= 7
            ? RANK_SCORE.exact_normalized
            : RANK_SCORE.substring,
        reason: reasonForField(field, "substring"),
        fieldKey: field.key,
      };
    }
  }

  if (field.kind === "email") {
    const emailValue = rawValue.toLowerCase();
    if (emailValue === query.raw.toLowerCase()) {
      return {
        rank: "exact_stored",
        score: RANK_SCORE.exact_stored,
        reason: reasonForField(field, "exact_stored"),
        fieldKey: field.key,
      };
    }
    if (emailValue.includes(query.normalized)) {
      return {
        rank: "substring",
        score: RANK_SCORE.substring,
        reason: reasonForField(field, "substring"),
        fieldKey: field.key,
      };
    }
  }

  if (normalizedValue === query.normalized) {
    return {
      rank: "exact_field",
      score: RANK_SCORE.exact_field,
      reason: reasonForField(field, "exact_field"),
      fieldKey: field.key,
    };
  }

  if (
    normalizedValue.startsWith(query.normalized) &&
    query.normalized.length >= 2
  ) {
    return {
      rank: "prefix",
      score: RANK_SCORE.prefix,
      reason: reasonForField(field, "prefix"),
      fieldKey: field.key,
    };
  }

  const valueTokens = normalizedValue.split(" ").filter(Boolean);
  if (
    query.tokens.length > 0 &&
    query.tokens.every((token) =>
      valueTokens.some(
        (valueToken) =>
          valueToken === token || valueToken.startsWith(token),
      ),
    )
  ) {
    return {
      rank: "token",
      score: RANK_SCORE.token,
      reason: reasonForField(field, "token"),
      fieldKey: field.key,
    };
  }

  const canFuzzy =
    query.normalized.length >= MIN_FUZZY_QUERY_LENGTH &&
    !isIdentifierKind(field.kind) &&
    field.kind !== "phone" &&
    field.kind !== "status";

  if (canFuzzy) {
    for (const queryToken of query.tokens) {
      if (
        queryToken.length < MIN_FUZZY_QUERY_LENGTH ||
        queryToken.length > MAX_FUZZY_TOKEN_LENGTH
      ) {
        continue;
      }

      for (const valueToken of valueTokens) {
        if (Math.abs(valueToken.length - queryToken.length) > MAX_EDIT_DISTANCE) {
          continue;
        }
        if (levenshtein(queryToken, valueToken) <= MAX_EDIT_DISTANCE) {
          return {
            rank: "typo",
            score: RANK_SCORE.typo,
            reason: `Close match for “${query.raw}”`,
            fieldKey: field.key,
          };
        }
      }
    }
  }

  if (
    query.normalized.length >= 2 &&
    normalizedValue.includes(query.normalized)
  ) {
    return {
      rank: "substring",
      score: RANK_SCORE.substring,
      reason: reasonForField(field, "substring"),
      fieldKey: field.key,
    };
  }

  return null;
}

export function rankSearchFields(
  fields: SearchField[],
  rawQuery: string,
): RankedSearchMatch | null {
  const query = tokenizeSearchQuery(rawQuery);
  if (!query.normalized) return null;

  let best: RankedSearchMatch | null = null;

  for (const field of fields) {
    const match = rankField(field, query);
    if (!match) continue;
    if (
      !best ||
      match.score > best.score ||
      (match.score === best.score && match.fieldKey < best.fieldKey)
    ) {
      best = match;
    }
  }

  return best;
}

export type RankedRecord<T> = {
  record: T;
  match: RankedSearchMatch;
};

export function rankAndSortRecords<T>(
  records: T[],
  rawQuery: string,
  getFields: (record: T) => SearchField[],
  options?: { limit?: number },
): RankedRecord<T>[] {
  const query = tokenizeSearchQuery(rawQuery);
  if (!query.normalized) {
    return records.map((record) => ({
      record,
      match: {
        rank: "exact_field",
        score: 0,
        reason: "",
        fieldKey: "",
      },
    }));
  }

  const ranked: RankedRecord<T>[] = [];

  for (const record of records) {
    const match = rankSearchFields(getFields(record), rawQuery);
    if (match) {
      ranked.push({ record, match });
    }
  }

  ranked.sort((left, right) => {
    if (right.match.score !== left.match.score) {
      return right.match.score - left.match.score;
    }
    return left.match.fieldKey.localeCompare(right.match.fieldKey);
  });

  if (options?.limit && options.limit > 0) {
    return ranked.slice(0, options.limit);
  }

  return ranked;
}
