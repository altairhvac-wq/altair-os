import {
  compactSearchIdentifier,
  normalizeSearchQuery,
} from "@/shared/lib/search/normalize-search-query";

export type SearchQueryTokens = {
  raw: string;
  normalized: string;
  compact: string;
  tokens: string[];
  compactTokens: string[];
};

export function tokenizeSearchQuery(raw: string): SearchQueryTokens {
  const normalized = normalizeSearchQuery(raw);
  const tokens = normalized ? normalized.split(" ").filter(Boolean) : [];
  const compact = compactSearchIdentifier(raw);
  const compactTokens = tokens
    .map((token) => compactSearchIdentifier(token))
    .filter(Boolean);

  return {
    raw: raw.trim(),
    normalized,
    compact,
    tokens,
    compactTokens,
  };
}
