type InvoiceNotesBlockProps = {
  notes: string;
  northStar?: boolean;
};

export function InvoiceNotesBlock({ notes, northStar = false }: InvoiceNotesBlockProps) {
  const trimmedNotes = notes.trim();

  if (!trimmedNotes) {
    return null;
  }

  return (
    <div
      className={
        northStar
          ? "invoice-notes-block rounded-xl border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-5 py-5 sm:px-6 sm:py-6 print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-0"
          : "invoice-notes-block rounded-xl border border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6 print:rounded-none print:border-slate-300 print:px-0 print:py-0"
      }
    >
      <p
        className={
          northStar
            ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6255] print:text-slate-600"
            : "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 print:text-slate-600"
        }
      >
        Additional notes
      </p>
      <p
        className={
          northStar
            ? "mt-4 break-words text-sm leading-7 text-[#4F4638] print:mt-3 print:text-base print:leading-relaxed print:text-slate-700"
            : "mt-4 break-words text-sm leading-7 text-slate-700 print:mt-3 print:text-base print:leading-relaxed"
        }
      >
        {trimmedNotes}
      </p>
    </div>
  );
}
