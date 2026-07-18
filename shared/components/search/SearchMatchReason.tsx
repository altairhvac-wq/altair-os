type SearchMatchReasonProps = {
  reason?: string | null;
  className?: string;
};

/** Concise match explanation for list/search results. */
export function SearchMatchReason({
  reason,
  className = "mt-0.5 text-xs text-slate-500",
}: SearchMatchReasonProps) {
  const trimmed = reason?.trim();
  if (!trimmed) return null;

  return (
    <p className={className} aria-label={`Match reason: ${trimmed}`}>
      {trimmed}
    </p>
  );
}
