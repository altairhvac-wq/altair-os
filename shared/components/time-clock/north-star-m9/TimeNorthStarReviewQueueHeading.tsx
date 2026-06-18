type TimeNorthStarReviewQueueHeadingProps = {
  entryCount: number;
  jobLabel?: string;
  className?: string;
};

export function TimeNorthStarReviewQueueHeading({
  entryCount,
  jobLabel,
  className = "",
}: TimeNorthStarReviewQueueHeadingProps) {
  const scopeLabel = jobLabel
    ? `Job ${jobLabel} · ${entryCount} entr${entryCount === 1 ? "y" : "ies"}`
    : `${entryCount} entr${entryCount === 1 ? "y" : "ies"} in scope`;

  return (
    <div
      className={`shrink-0 border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6324]">
        Payroll review
      </p>
      <h2 className="mt-0.5 text-sm font-bold text-[#17130E]">Time ledger</h2>
      <p className="mt-0.5 text-[11px] leading-snug text-[#6B6255]">
        Shift, break, and job-labor entries · {scopeLabel}
      </p>
    </div>
  );
}
