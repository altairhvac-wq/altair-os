type ExpensesNorthStarReviewQueueHeadingProps = {
  className?: string;
};

export function ExpensesNorthStarReviewQueueHeading({
  className = "",
}: ExpensesNorthStarReviewQueueHeadingProps) {
  return (
    <div
      className={`shrink-0 border-b border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3 py-2.5 sm:px-4 lg:px-5 ${className}`}
    >
      <h2 className="text-sm font-bold text-[#17130E]">Review queue</h2>
      <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
        Receipts, reimbursements, and company spending waiting for review.
      </p>
    </div>
  );
}
