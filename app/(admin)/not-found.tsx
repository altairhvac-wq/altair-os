import Link from "next/link";
import { SearchX } from "lucide-react";

/**
 * "Not found" inside the signed-in app.
 *
 * Without this file a missing record under the office app (a job, a team
 * member, an invoice that was deleted) fell through to the public site's 404
 * page, which offers "Home / Pricing / Resources". Those are marketing pages;
 * a signed-in owner who followed a stale link wants to get back to work (UI
 * audit 2026-11-12).
 *
 * This renders inside the app shell, so the sidebar and the phone tab bar are
 * still there. It only needs to say what happened and offer the way back.
 */
export default function AdminNotFound() {
  return (
    <div className="mx-auto mt-6 flex w-full max-w-xl flex-col items-center rounded-2xl border border-altair-border/40 bg-altair-paper px-6 py-12 text-center shadow-[var(--elev-hairline),var(--elev-2)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-altair-brass/15 text-[var(--brand-metal-text)]">
        <SearchX className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-lg font-bold text-altair-ink-on-paper">
        We could not find that
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-altair-ink-on-paper-secondary">
        It may have been removed, or the link is out of date. Nothing is wrong
        with your account.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-altair-brass px-5 text-sm font-bold text-[#1C1913] transition-colors hover:bg-altair-brass-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
