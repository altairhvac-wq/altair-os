import Link from "next/link";
import { ArrowRight, BadgeCheck, ChartColumn, Check, Link2, ShieldCheck, Wallet } from "lucide-react";
import { dirBrassButton, dirDarkButton } from "@/shared/components/directory/directory-styles";
import { DIRECTORY_LIST_PATH, DIRECTORY_MEMBER_LABEL } from "@/shared/types/directory";
import { isDirectory214Installed } from "@/lib/directory/schema";

/**
 * What a business gets for listing, said the same way everywhere it is
 * offered. Each line is a thing the directory actually does; none is a
 * promise of customers. No line promises the listing stays free or fee-less:
 * the owner keeps the option to add paid features or fees (2026-11-23).
 */
export const LISTING_VALUE: readonly { icon: typeof Wallet; title: string; text: string }[] = [
  { icon: Wallet, title: "Free to list", text: "No account to make. Customers call you directly, not through a middleman." },
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

/**
 * The "get listed" card beside the results (owner, 2026-11-23: put it where
 * business owners see it, not only at the bottom). It follows who the page is
 * for: on the subcontractor view it speaks to trades that want sub work.
 * Three reasons, each something the directory does today; no promise about
 * price beyond "free to list" (fees stay an option for the owner).
 */
export function ListSideCard({
  listHref = DIRECTORY_LIST_PATH,
  mode = "pro",
  heading,
  className = "",
}: {
  readonly listHref?: string;
  readonly mode?: "pro" | "sub";
  readonly heading?: string;
  readonly className?: string;
}) {
  const sub = mode === "sub";
  const reasons = sub
    ? ["Contractors with overflow work find you", "Tick “takes subcontract work”", "A link to your website"]
    : ["Homeowners and contractors find you", "A link to your website", "Monthly numbers on views and calls"];
  return (
    <div className={`rounded-2xl border-t-2 border-[#C2A05A] bg-[#0d0f0c] px-5 py-5 text-[#f3ebdd] ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C2A05A]">{sub ? "Looking for sub work?" : "For contractors"}</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-[#fff9ea]">{heading ?? (sub ? "Get found by contractors" : "Get listed free")}</h2>
      <ul className="mt-3 space-y-1.5">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-2 text-[13px] leading-snug text-[#cfc6b6]">
            <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C2A05A]" strokeWidth={2.5} />
            {reason}
          </li>
        ))}
      </ul>
      <Link href={listHref} data-track={sub ? "dir-side-list-sub" : "dir-side-list"} className={`mt-4 w-full ${dirBrassButton}`}>
        List your business <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
      <p className="mt-2.5 text-center text-[11px] text-[#8f8676]">Free to list. About two minutes.</p>
    </div>
  );
}

/** The one-line version for phones, under the search, where the side card does not fit. */
export function ListStrip({ listHref = DIRECTORY_LIST_PATH, mode = "pro" }: { readonly listHref?: string; readonly mode?: "pro" | "sub" }) {
  return (
    <Link
      href={listHref}
      data-track="dir-strip-list"
      className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[#C2A05A]/50 bg-[#FBF6EA] px-4 text-sm text-[#5c4614] lg:hidden"
    >
      <span>{mode === "sub" ? "Want sub work? Get found here." : "Own a trade business?"}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#77591B]">
        List free <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </span>
    </Link>
  );
}

/**
 * The same reasons as the bottom band, stacked down the left of the search
 * results on wide screens (owner, 2026-11-23: the band sat in an odd spot
 * while the sides of the page were empty). Below xl the band shows instead.
 */
export async function ListValueRail() {
  const values = listingValue(await isDirectory214Installed());
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">Why list here</p>
      <ul className="mt-4 space-y-4">
        {values.slice(0, 4).map((item) => (
          <li key={item.title} className="flex gap-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FBF6EA] text-[#77591B] ring-1 ring-inset ring-[#C2A05A]/40">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-snug text-stone-900">{item.title}</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-stone-600">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500">
        Run your business on Altair Operating System? Link your listing and it shows “{DIRECTORY_MEMBER_LABEL}”.
      </p>
    </div>
  );
}
