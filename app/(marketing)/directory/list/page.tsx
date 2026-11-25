import type { Metadata } from "next";
import Link from "next/link";
import { submitListingAction } from "@/app/actions/directory";
import { ListingForm, type ListingFormPrefill } from "@/shared/components/directory/ListingForm";
import { listingValue } from "@/shared/components/directory/DirectoryPitch";
import { isDirectory214Installed } from "@/lib/directory/schema";
import { DirectoryBand, DirectoryBreadcrumbs } from "@/shared/components/directory/DirectoryUi";
import { dirLink } from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  DIRECTORY_LIMITS,
  DIRECTORY_LIST_PATH,
  DIRECTORY_MANAGE_PATH,
  DIRECTORY_PATH,
  DIRECTORY_TRADES,
  isUsStateCode,
} from "@/shared/types/directory";

const TITLE = "Get your business listed free";
const DESCRIPTION =
  "List your HVAC, plumbing, electrical or other trade business free: a followed link to your website, monthly numbers and a badge for your site. A person checks every listing.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: DIRECTORY_LIST_PATH, title: TITLE, description: DESCRIPTION }),
};

const TIMELINE: readonly { title: string; text: string }[] = [
  { title: "Fill in five things", text: "About two minutes. Add details now or later." },
  { title: "Confirm your email", text: "Press the link we send. Nothing is public before that." },
  { title: "A person checks it", text: "Usually within one business day." },
  { title: "You're live", text: "Then add photos, see your numbers and put the badge on your site." },
];

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Trade and place carried over from an empty search, checked against our own lists. */
function readPrefill(params: Record<string, string | string[] | undefined>): ListingFormPrefill {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const trade = first(params.trade);
  const state = first(params.state).toUpperCase();
  const city = first(params.city).replace(/[^\p{L} .'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, DIRECTORY_LIMITS.city.max);
  return {
    ...(DIRECTORY_TRADES.includes(trade as (typeof DIRECTORY_TRADES)[number]) ? { tradeType: trade } : {}),
    ...(isUsStateCode(state) ? { state } : {}),
    ...(city.length >= DIRECTORY_LIMITS.city.min ? { city } : {}),
  };
}

/** The form a contractor fills in to be in the directory. No account is created. */
export default async function DirectoryListPage({ searchParams }: PageProps) {
  const prefill = readPrefill(await searchParams);
  // Before migration 214 the plain phase-1 form and promises are shown.
  const v214 = await isDirectory214Installed();
  const timeline = v214 ? TIMELINE : TIMELINE.map((item, index) => (index === 3 ? { ...item, text: "We email you the link. Change or remove it any time." } : item));
  return (
    <ResourceChrome>
      <ResourceMain width="app">
        <DirectoryBand>
          <DirectoryBreadcrumbs trail={[{ label: "Directory", href: DIRECTORY_PATH }, { label: "Get listed free" }]} tone="dark" />
          <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C2A05A]">Get listed free</p>
              <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] tracking-tight text-[#fff9ea] sm:text-[2.75rem]">
                Be easy to find, and keep every call.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[#cfc6b6] sm:text-lg">
                Homeowners look here for a pro, and contractors look here for subs and referral partners. Listing is
                free, and the calls come straight to you.
              </p>
              {/* Phones (2026-11-24): the form comes right after this line; the cards and steps below are for wider screens. */}
              <p className="mt-3 text-[13px] font-semibold text-[#C2A05A] sm:hidden">Free to list · No account · About two minutes</p>
              <a
                href="#form"
                data-track="dir-list-start"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#a4823a] px-5 text-sm font-semibold text-[#0d0f0c] sm:hidden"
              >
                Start your listing
              </a>
            </div>
            <ul className="hidden gap-2.5 sm:grid sm:grid-cols-2">
              {listingValue(v214).map((item) => (
                <li key={item.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 last:sm:col-span-2">
                  <item.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#C2A05A]" />
                  <span>
                    <span className="block text-sm font-semibold text-[#fff9ea]">{item.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#a99f8f]">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DirectoryBand>

        {/* The form ends with the same steps, so phones skip this copy (2026-11-24: the form started almost two screens down). */}
        <section aria-label="What happens next" className="mt-6 hidden sm:block">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {timeline.map((item, index) => (
              <li key={item.title} className="relative flex gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d0f0c] font-mono text-xs font-semibold text-[#e8d9ac]">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-stone-600">{item.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <div id="form" className="mt-6 scroll-mt-24">
          <ListingForm action={submitListingAction} mode="create" submitLabel="Send my listing" prefill={prefill} basic={!v214} />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-stone-500">
          Already listed?{" "}
          <Link href={DIRECTORY_MANAGE_PATH} className={dirLink}>
            Edit or remove your listing
          </Link>
          . Every listing is added by the business itself or with its permission; we never create listings from public records. How we handle
          your details is in the{" "}
          <Link href="/privacy" className={dirLink}>
            privacy policy
          </Link>
          .
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
