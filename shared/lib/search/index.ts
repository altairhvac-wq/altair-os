export {
  normalizeSearchQuery,
  compactSearchIdentifier,
  normalizeSearchPhone,
  normalizeSearchField,
} from "@/shared/lib/search/normalize-search-query";
export { tokenizeSearchQuery } from "@/shared/lib/search/tokenize-search-query";
export {
  parseDocumentReference,
  type DocumentKind,
  type ParsedDocumentReference,
} from "@/shared/lib/search/parse-document-reference";
export {
  rankSearchFields,
  rankAndSortRecords,
  type SearchField,
  type SearchFieldKind,
  type SearchMatchRank,
  type RankedSearchMatch,
  type RankedRecord,
} from "@/shared/lib/search/rank-search-match";
export {
  buildJobSearchFields,
  buildEstimateSearchFields,
  buildInvoiceSearchFields,
  type JobSearchRelatedDocuments,
  type EstimateSearchRelatedDocuments,
} from "@/shared/lib/search/build-record-search-text";
