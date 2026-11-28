import { DIRECTORY_MEMBER_LABEL } from "@/shared/types/directory";

/**
 * The "Altair member" mark on a public directory listing.
 *
 * Shown only when the listing is linked to an Altair workspace that is
 * currently active (`DirectoryPublicListing.isMember`). It says the business
 * runs on Altair Operating System and nothing more: it is not a review, a
 * verification or an endorsement, and wherever it appears the page says so in
 * words (`DIRECTORY_MEMBER_MEANING`).
 *
 * Solid and dark so it cannot be mistaken for the outlined "Takes
 * subcontract work" tag beside it, which the business sets itself.
 */
export function DirectoryMemberBadge({ className = "" }: { readonly className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#17130E] py-0.5 pl-1.5 pr-2.5 text-xs font-semibold text-[#F3E3B5] ${className}`}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5 text-[#D9B45F]">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M4.9 8.3l2.1 2.1 4.1-4.5" fill="none" stroke="#17130E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {DIRECTORY_MEMBER_LABEL}
    </span>
  );
}
