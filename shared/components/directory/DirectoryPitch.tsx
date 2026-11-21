import Link from "next/link";
import { ArrowRight, BadgeCheck, ChartColumn, Link2, ShieldCheck, Wallet } from "lucide-react";
import { dirBrassButton, dirDarkButton } from "@/shared/components/directory/directory-styles";
import { DIRECTORY_LIST_PATH, DIRECTORY_MEMBER_LABEL } from "@/shared/types/directory";
import { isDirectory214Installed } from "@/lib/directory/schema";

/**
 * What a business gets for listing, said the same way everywhere it is
 * offered. Each line is a thing the directory actually does; none is a
 * promise of customers. "Free forever" is the owner's decision (2026-11-20).
 */
export const LISTING_VALUE: readonly { icon: typeof Wallet; title: string; text: string }[] = [
  { icon: Wallet, title: "Free forever, no lead fees", text: "No subscription, no charge per call, and no selling the same customer to five companies." },
  { icon: Link2, title: "A followed link to your website", text: "Your listing links straight to your site, the way a real referral would." },
  { icon: ChartColumn, title: "Your numbers every month", text: "How many people viewed your listing and tapped call, website or map." },
  { icon: BadgeCheck, title: "A badge for your own website", text: "“Listed on Altair” links visitors from your site to your listing." },
  { icon: ShieldCheck, title: "Checked by a person", text: "Every listing is read by a person before it shows. Nothing is added without you." },
];

/** The promises that hold right now: monthly numbers need migration 214. */
export function listingValue(v214: boolean) {
  return v214 ? LISTING_VALUE : LISTING_VALUE.filter((item) => item.icon !== ChartColumn);
}

/** A compact "get listed" band for the bottom of the search, place and business pages. */
export async function ListFreeBand({ heading = "Run a trade business? Get listed free." }: { readonly heading?: string }) {
  const values = listingValue(await isDirectory214Installed());
  return (
    <aside className="mt-12 overflow-hidden rounded-3xl bg-[#0d0f0c] text-[#f3ebdd]">
      <div className="grid gap-8 px-5 py-8 sm:px-10 sm:py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C2A05A]">For contractors</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#fff9ea] sm:text-[1.75rem]">{heading}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#cfc6b6]">
            Homeowners look here for a pro, and other contractors look here for subs and referral partners. It takes about
            two minutes.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={DIRECTORY_LIST_PATH} data-track="dir-list-cta" className={dirBrassButton}>
              Get listed free <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/directory/manage" className={dirDarkButton}>
              Manage a listing
            </Link>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {values.slice(0, 4).map((item) => (
            <li key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <item.icon aria-hidden="true" className="h-5 w-5 text-[#C2A05A]" />
              <p className="mt-2.5 text-sm font-semibold text-[#fff9ea]">{item.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#a99f8f]">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-relaxed text-[#8f8676] sm:px-10">
        Run your business on Altair Operating System? Link your listing and it shows “{DIRECTORY_MEMBER_LABEL}”.
      </p>
    </aside>
  );
}
