/** Skeleton in the document's own shape, so the page does not jump when it lands. */
export default function InvoicePaymentLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl animate-pulse space-y-4">
        <div className="h-28 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white" />
        <div className="h-20 rounded-2xl border border-slate-200 bg-white" />
        <span className="sr-only">Loading your invoice…</span>
      </div>
    </main>
  );
}
