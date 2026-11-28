import Link from "next/link";
import { SAVED_NUMBERS_EYEBROW } from "@/shared/lib/resources/saved-numbers";

/**
 * "Keep these numbers": what Altair Operating System does with the number
 * this page just worked out. One paragraph and one plain link to the public
 * page for that part of the product. Copy lives in `saved-numbers.ts`; it
 * says where a number goes and never claims a result.
 *
 * Server component. Left out of a printed copy: a print is the visitor's
 * own worksheet.
 */
export function SavedNumbersNote({
  text,
  href,
  linkText,
  className = "",
}: {
  readonly text: string;
  readonly href: string;
  /** The destination's own name ("HVAC estimating software"). */
  readonly linkText: string;
  readonly className?: string;
}) {
  return (
    <aside aria-label={SAVED_NUMBERS_EYEBROW} className={`rounded-xl border border-[#C2A05A]/30 bg-[#FBF7EF] px-5 py-4 print:hidden ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">{SAVED_NUMBERS_EYEBROW}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
        {text}{" "}
        <Link
          href={href}
          className="rounded-sm font-medium text-[#77591B] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
        >
          See {linkText}
        </Link>
      </p>
    </aside>
  );
}
