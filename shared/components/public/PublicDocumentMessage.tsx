import { PublicDocumentBrandFooter } from "@/shared/components/brand/PublicDocumentBrandFooter";

/**
 * The recovery screen for public estimate/invoice links.
 *
 * These pages are reached by a homeowner from an email, with no account and no
 * session. Falling through to the root boundaries handed them a screen written
 * for a signed-in tenant, whose only way forward was "Back to dashboard" — a
 * link to a login wall for someone who has nothing to log into. So these
 * segments get their own boundaries, and the way forward is the company that
 * sent the document, not this product.
 */
export function PublicDocumentMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
      <div className="mt-6">
        <PublicDocumentBrandFooter />
      </div>
    </main>
  );
}
