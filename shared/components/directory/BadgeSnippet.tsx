"use client";

import { useState } from "react";
import { BadgeCheck, Check, Copy } from "lucide-react";
import { dirPanel, dirSecondaryButton } from "@/shared/components/directory/directory-styles";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { DIRECTORY_BADGE_ALT, DIRECTORY_BADGE_PATH, DIRECTORY_BADGE_SIZE } from "@/shared/types/directory";

/**
 * "Listed on Altair" for the business's own website: a picture that links
 * to their listing. The code is built on the server from the public site's
 * address and the listing's slug; the business copies and pastes it.
 */
export function BadgeSnippet({ snippet }: { readonly snippet: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      trackEngagement("cta_click", "dir-badge-copy", { repeat: true });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <section aria-labelledby="manage-badge-heading" className={`px-5 py-6 sm:px-7 ${dirPanel}`}>
      <h2 id="manage-badge-heading" className="flex items-center gap-2 text-base font-semibold text-[#0A0A0A]">
        <BadgeCheck aria-hidden="true" className="h-4 w-4 text-[#A4823A]" /> A badge for your website
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        Paste this into your site, for example in the footer. Visitors who press it see your listing.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <div className="flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DIRECTORY_BADGE_PATH} alt={DIRECTORY_BADGE_ALT} width={DIRECTORY_BADGE_SIZE.width} height={DIRECTORY_BADGE_SIZE.height} />
        </div>
        <div className="min-w-0">
          <label htmlFor="badge-code" className="text-[13px] font-medium text-stone-800">
            The code
          </label>
          <textarea
            id="badge-code"
            readOnly
            rows={4}
            value={snippet}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-1.5 w-full resize-none rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-[12px] leading-relaxed text-stone-700 outline-none focus:border-[#A4823A] focus:ring-2 focus:ring-[#C2A05A]/30"
          />
          <button type="button" onClick={() => void copy()} className={`mt-2 ${dirSecondaryButton} min-h-10 gap-2 px-4`}>
            {copied ? <Check aria-hidden="true" className="h-4 w-4 text-[#2f5d2a]" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            {copied ? "Copied" : "Copy the code"}
          </button>
        </div>
      </div>
    </section>
  );
}
