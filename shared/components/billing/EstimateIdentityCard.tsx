import { formatDate } from "@/shared/types/customer";

type EstimateIdentityCardProps = {
  estimateNumber: string;
  issueDate: string;
  validUntil?: string | null;
  northStar?: boolean;
};

export function EstimateIdentityCard({
  estimateNumber,
  issueDate,
  validUntil,
  northStar = false,
}: EstimateIdentityCardProps) {
  const trimmedValidUntil = validUntil?.trim();
  const numberClass = northStar
    ? "text-sm font-bold tabular-nums tracking-tight text-[#17130E] sm:text-base print:text-sm"
    : "text-sm font-bold tabular-nums tracking-tight text-slate-900 sm:text-base print:text-sm";
  const metaClass = northStar
    ? "text-xs leading-snug text-[#64748B] print:text-slate-700"
    : "text-xs leading-snug text-slate-600 print:text-slate-700";

  return (
    <div className="estimate-document-meta min-w-0">
      <p className={numberClass}>{estimateNumber}</p>
      <p className={`mt-0.5 ${metaClass}`}>
        Issued {formatDate(issueDate)}
        {trimmedValidUntil ? (
          <>
            <span className={northStar ? "text-[#8A6324]" : "text-slate-400"} aria-hidden>
              {" "}
              ·{" "}
            </span>
            Valid through {formatDate(trimmedValidUntil)}
          </>
        ) : null}
      </p>
    </div>
  );
}
