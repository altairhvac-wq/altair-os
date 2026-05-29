type InvoiceNotesBlockProps = {
  notes: string;
};

export function InvoiceNotesBlock({ notes }: InvoiceNotesBlockProps) {
  const trimmedNotes = notes.trim();

  if (!trimmedNotes) {
    return null;
  }

  return (
    <div className="invoice-notes-block rounded-xl border border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6 print:rounded-none print:border-slate-300 print:px-0 print:py-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 print:text-slate-600">
        Additional notes
      </p>
      <p className="mt-4 break-words text-sm leading-7 text-slate-700 print:mt-3 print:text-base print:leading-relaxed">
        {trimmedNotes}
      </p>
    </div>
  );
}
