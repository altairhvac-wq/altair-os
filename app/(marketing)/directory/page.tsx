import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronDown, HardHat, Home, Search, SearchX } from "lucide-react";
import { searchPublicListings } from "@/lib/directory/listings";
import { isDirectory216Installed } from "@/lib/directory/schema";
import { citiesWithListings, listDirectoryFacets, tradesWithListings } from "@/lib/directory/places";
import {
  DIR_PHONE_FIRST,
  dirBrassButton,
  dirFocus,
  dirInput,
  dirLink,
  dirPanel,
  dirSecondaryButton,
  dirShowMoreRest,
} from "@/shared/components/directory/directory-styles";
import {
  Chip,
  DirectoryBand,
  ListingResultCard,
  breadcrumbJsonLd,
  itemListJsonLd,
} from "@/shared/components/directory/DirectoryUi";
import { ListFreeBand, ListSideCard, ListStrip, ListValueRail } from "@/shared/components/directory/DirectoryPitch";
import { FilterSheet, ShowMoreList } from "@/shared/components/directory/DirectoryPhoneNav";
import { TradeIcon } from "@/shared/components/directory/trade-icons";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  DIRECTORY_LIST_PATH,
  DIRECTORY_MEMBER_LABEL,
  DIRECTORY_MEMBER_MEANING,
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_PATH,
  DIRECTORY_TRADES,
  US_STATES,
  directoryCityPath,
  directorySearchHref,
  hasActiveSearch,
  parseDirectorySearch,
  stateName,
  type DirectorySearch,
} from "@/shared/types/directory";

/**
 * The public contractor directory: search published listings by trade and
 * place. No account, nothing to sign in to.
 *
 * Two audiences, one list: a homeowner looking for a pro, and a contractor
 * looking for a sub or a referral partner (the "takes subcontract work"
 * filter). The search is a plain GET form, so a search is a link someone can
 * send, the back button works, and the page works without JavaScript.
 *
 * The chips under the search are live: only trades and cities that have a
 * published listing are offered, with how many. The page never claims a
 * size it does not have, and when a search finds nothing it says so and
 * offers the one useful next step: be the first business listed there.
 */

const TITLE = "Contractor directory";
const DESCRIPTION =
  "Find HVAC, plumbing, electrical and other trade contractors and subcontractors by trade and city. Every listing is added by the business and checked by a person. Free to search, free to list.";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const search = parseDirectorySearch(await searchParams);
  const filtered = hasActiveSearch(search) || search.page > 1;
  return {
    title: TITLE,
    description: DESCRIPTION,
    ...buildPublicSocialMetadata({ path: DIRECTORY_PATH, title: TITLE, description: DESCRIPTION }),
    // A filtered or paged view is the same directory, sliced: one page is
    // enough for a search engine, and its address is /directory. The place
    // pages (/directory/ut/...) are the addresses meant to be found.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

function describeResults(search: DirectorySearch, total: number): string {
  const count = `${total} ${total === 1 ? "business" : "businesses"}`;
  const what = search.trade ? ` for ${search.trade}` : "";
  const where = search.place
    ? ` near “${search.place}”${search.state ? `, ${stateName(search.state)}` : ""}`
    : search.state
      ? ` in ${stateName(search.state)}`
      : "";
  const sub = search.subOnly ? " that take subcontract work" : "";
  return `${count}${what}${where}${sub}`;
}

/** Where an empty search asks to be filled: "HVAC" and "Provo" become the heading. */
function emptyHeading(search: DirectorySearch): string {
  const what = search.trade ? `${search.trade} ${search.trade === "Other" ? "business" : "company"}` : "business";
  const where = search.place ?? (search.state ? stateName(search.state) : null);
  return where ? `Be the first ${what} listed in ${where}.` : `Be the first ${what} listed here.`;
}

function listHrefFor(search: DirectorySearch): string {
  const params = new URLSearchParams();
  if (search.trade) params.set("trade", search.trade);
  if (search.place && !/^\d{5}$/.test(search.place)) params.set("city", search.place);
  if (search.state) params.set("state", search.state);
  const query = params.toString();
  return query ? `${DIRECTORY_LIST_PATH}?${query}` : DIRECTORY_LIST_PATH;
}

/** One of the two "who are you hiring" choices: a link, highlighted when it is the view shown. */
function AudienceCard({
  href,
  active,
  icon: Icon,
  title,
  text,
  track,
}: {
  readonly href: string;
  readonly active: boolean;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly text: string;
  readonly track: string;
}) {
  return (
    <Link
      href={href}
      data-track={track}
      aria-current={active ? "true" : undefined}
      className={`flex min-h-14 items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${dirFocus} focus-visible:ring-offset-[#0d0f0c] ${
        active ? "border-2 border-[#C2A05A] bg-[#fff9ea] text-[#0d0f0c]" : "border border-white/15 bg-white/[0.04] text-[#fff9ea] hover:border-white/35"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-[#0d0f0c] text-[#C2A05A]" : "bg-[#C2A05A]/15 text-[#C2A05A]"}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug">{title}</span>
        <span className={`mt-0.5 block text-xs ${active ? "text-stone-600" : "text-[#a99f8f]"}`}>{text}</span>
      </span>
    </Link>
  );
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const search = parseDirectorySearch(await searchParams);
  const [result, facetData, quotesOn] = await Promise.all([searchPublicListings(search), listDirectoryFacets(), isDirectory216Installed()]);
  const filtered = hasActiveSearch(search);
  const pages = Math.max(1, Math.ceil(result.total / DIRECTORY_PAGE_SIZE));
  const page = Math.min(search.page, pages);
  // Members are listed first. A visitor is told so wherever it is true.
  const showsMembers = result.listings.some((listing) => listing.isMember);
  const contractorMode = search.subOnly;

  const facets = facetData.facets;
  const liveTrades = tradesWithListings(facets, { state: search.state });
  const liveCities = citiesWithListings(facets, { state: search.state, trade: search.trade }).slice(0, 14);

  const trail = [{ label: "Home", href: "/" }, { label: "Directory" }];

  return (
    <ResourceChrome>
      <JsonLdScript data={breadcrumbJsonLd(PUBLIC_SITE_ORIGIN, trail, DIRECTORY_PATH)} />
      {result.listings.length > 0 ? (
        <JsonLdScript data={itemListJsonLd(PUBLIC_SITE_ORIGIN, "Contractor directory", result.listings)} />
      ) : null}
      <ResourceMain width="directory">
        <DirectoryBand compact>
          {/* Title left, "who are you hiring" right; the search runs as one row under both (owner, 2026-11-23: less tall). */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C2A05A]">Contractor directory</p>
              <h1 className="mt-2 text-[1.75rem] font-semibold leading-[1.1] tracking-tight text-[#fff9ea] sm:text-[2.125rem]">
                {contractorMode ? "Find a sub or a referral partner." : "Find a trade pro near you."}
              </h1>
              <p className="mt-2 hidden text-sm leading-relaxed text-[#cfc6b6] sm:block sm:text-[15px]">
                Listed by the owner or with permission, checked by a person. Free to search, no account.
              </p>
            </div>
            <div className="hidden sm:block">
              {/* Two links, so each view is its own address someone can send. On a phone the sticky bar below does this. */}
              <p id="directory-audience-label" className="text-[13px] font-semibold text-[#fff9ea]">
                Who are you hiring?
              </p>
              <div role="group" aria-labelledby="directory-audience-label" className="mt-2 grid gap-2.5 sm:grid-cols-2">
                <AudienceCard
                  href={directorySearchHref({ ...search, subOnly: false, page: 1 })}
                  active={!contractorMode}
                  icon={Home}
                  title="A pro for my home or business"
                  text="Repairs, installs and projects"
                  track="dir-audience-pro"
                />
                <AudienceCard
                  href={directorySearchHref({ ...search, subOnly: true, page: 1 })}
                  active={contractorMode}
                  icon={HardHat}
                  title="A subcontractor"
                  text="For contractors with overflow work"
                  track="dir-audience-sub"
                />
              </div>
            </div>
          </div>

          <form
            action={DIRECTORY_PATH}
            method="get"
            role="search"
            aria-label="Search the directory"
            data-track-submit="dir-search"
            className="mt-5 hidden rounded-2xl bg-white p-2.5 text-stone-900 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)] sm:block sm:p-3"
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)_auto] lg:items-end">
              <div className="col-span-2 lg:col-span-1">
                <label htmlFor="directory-trade" className="block text-[12px] font-semibold uppercase tracking-wide text-stone-500">
                  Trade
                </label>
                <select id="directory-trade" name="trade" defaultValue={search.trade ?? ""} className={`mt-1.5 ${dirInput}`}>
                  <option value="">Any trade</option>
                  {DIRECTORY_TRADES.map((trade) => (
                    <option key={trade} value={trade}>
                      {trade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="directory-place" className="block text-[12px] font-semibold uppercase tracking-wide text-stone-500">
                  City or ZIP
                </label>
                <input
                  id="directory-place"
                  name="place"
                  type="text"
                  defaultValue={search.place ?? ""}
                  maxLength={60}
                  autoComplete="off"
                  placeholder="Salt Lake City"
                  className={`mt-1.5 ${dirInput}`}
                />
              </div>
              <div>
                <label htmlFor="directory-state" className="block text-[12px] font-semibold uppercase tracking-wide text-stone-500">
                  State
                </label>
                <select id="directory-state" name="state" defaultValue={search.state ?? ""} className={`mt-1.5 ${dirInput}`}>
                  <option value="">Any state</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={`col-span-2 lg:col-span-1 ${dirBrassButton}`}>
                <Search aria-hidden="true" className="h-4 w-4" /> Search
              </button>
            </div>
            {/* The "who are you hiring" choice above sets this; a search keeps it. */}
            {search.subOnly ? <input type="hidden" name="sub" value="1" /> : null}
            {search.trade || search.place || search.state ? (
              <div className="mt-3 flex justify-end border-t border-stone-100 px-1 pt-2">
                <Link href={DIRECTORY_PATH} className={`inline-flex min-h-9 items-center text-sm ${dirLink}`}>
                  Clear search
                </Link>
              </div>
            ) : null}
          </form>

          {/* Phone: one search box; trade and the rest live in the Filters sheet. */}
          <form action={DIRECTORY_PATH} method="get" role="search" aria-label="Search by city" data-track-submit="dir-search" className="mt-4 flex gap-2 sm:hidden">
            <label htmlFor="directory-place-phone" className="sr-only">
              City or ZIP
            </label>
            <input
              id="directory-place-phone"
              name="place"
              type="search"
              defaultValue={search.place ?? ""}
              maxLength={60}
              autoComplete="off"
              placeholder="City or ZIP"
              className={`${dirInput} min-w-0 flex-1`}
            />
            {search.trade ? <input type="hidden" name="trade" value={search.trade} /> : null}
            {search.state ? <input type="hidden" name="state" value={search.state} /> : null}
            {search.subOnly ? <input type="hidden" name="sub" value="1" /> : null}
            <button type="submit" aria-label="Search" className={`${dirBrassButton} shrink-0 px-4`}>
              <Search aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
          {/* Phones (2026-11-24): business owners saw "List free" only at the very bottom, under every listing. */}
          <Link
            href={listHrefFor(search)}
            data-track="dir-hero-list"
            className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[#C2A05A]/40 bg-white/[0.05] px-4 text-sm text-[#e8d9ac] sm:hidden"
          >
            <span>{contractorMode ? "Want sub work? Get found here." : "Own a trade business?"}</span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#fff9ea]">
              Get listed free <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </Link>
        </DirectoryBand>

        {/* Phone navigation: stays under the site header while scrolling. */}
        <nav
          aria-label="Directory"
          className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-4 mt-3 border-b border-stone-200 bg-[#fbf8f3]/95 px-4 py-2 backdrop-blur sm:hidden"
        >
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-1">
            <div className="grid flex-1 grid-cols-2 gap-1">
              <Link
                href={directorySearchHref({ ...search, subOnly: false, page: 1 })}
                aria-current={!contractorMode ? "true" : undefined}
                data-track="dir-audience-pro"
                className={`inline-flex min-h-9 items-center justify-center rounded-lg text-[13px] font-semibold ${!contractorMode ? "bg-[#0d0f0c] text-[#fff9ea]" : "text-stone-600"}`}
              >
                Pros
              </Link>
              <Link
                href={directorySearchHref({ ...search, subOnly: true, page: 1 })}
                aria-current={contractorMode ? "true" : undefined}
                data-track="dir-audience-sub"
                className={`inline-flex min-h-9 items-center justify-center rounded-lg text-[13px] font-semibold ${contractorMode ? "bg-[#0d0f0c] text-[#fff9ea]" : "text-stone-600"}`}
              >
                Subs
              </Link>
            </div>
            <span aria-hidden="true" className="h-6 w-px bg-stone-200" />
            <FilterSheet label={search.trade || search.state ? [search.trade, search.state].filter(Boolean).join(", ") : "Filters"}>
              <form action={DIRECTORY_PATH} method="get" className="space-y-3">
                <div>
                  <label htmlFor="sheet-trade" className="block text-[12px] font-semibold uppercase tracking-wide text-stone-500">
                    Trade
                  </label>
                  <select id="sheet-trade" name="trade" defaultValue={search.trade ?? ""} className={`mt-1.5 ${dirInput}`}>
                    <option value="">Any trade</option>
                    {DIRECTORY_TRADES.map((trade) => (
                      <option key={trade} value={trade}>
                        {trade}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sheet-place" className="block text-[12px] font-semibold uppercase tracking-wide text-stone-500">
                      City or ZIP
                    </label>
                    <input id="sheet-place" name="place" type="text" defaultValue={search.place ?? ""} maxLength={60} autoComplete="off" className={`mt-1.5 ${dirInput}`} />
                  </div>
                  <div>
                    <label htmlFor="sheet-state" className="block text-[12px] font-semibold uppercase tracking-wide text-stone-500">
                      State
                    </label>
                    <select id="sheet-state" name="state" defaultValue={search.state ?? ""} className={`mt-1.5 ${dirInput}`}>
                      <option value="">Any state</option>
                      {US_STATES.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex min-h-9 items-center gap-2.5 text-sm text-stone-800">
                  <input type="checkbox" name="sub" value="1" defaultChecked={search.subOnly} className="h-4 w-4 rounded border-stone-400 accent-[#77591B]" />
                  Only businesses that take sub work
                </label>
                <button type="submit" className={`w-full ${dirBrassButton}`}>
                  <Search aria-hidden="true" className="h-4 w-4" /> Show results
                </button>
                {search.trade || search.place || search.state ? (
                  <Link
                    href={directorySearchHref({ ...search, trade: null, place: null, state: null, page: 1 })}
                    className={`flex min-h-9 items-center justify-center text-sm ${dirLink}`}
                  >
                    Clear filters
                  </Link>
                ) : null}
              </form>
              {liveCities.length > 0 ? (
                <div className="mt-5 border-t border-stone-100 pt-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-stone-500">Cities with listings</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {liveCities.map((city) => (
                      <Chip key={`sheet-${city.state}-${city.slug}`} href={directoryCityPath(city.state, city.label)} count={city.count} track="dir-chip-city">
                        {city.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
            </FilterSheet>
          </div>
        </nav>

        {/* Phone: browse by trade, as tiles in one row. */}
        {liveTrades.length > 0 ? (
          <div className="-mx-4 mt-3 sm:hidden">
            <p className="px-4 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Browse by trade</p>
            <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {liveTrades.map(({ trade }) => {
                const active = search.trade === trade;
                return (
                  <Link
                    key={`tile-${trade}`}
                    href={directorySearchHref({ ...search, trade: active ? null : trade, page: 1 })}
                    data-track="dir-tile-trade"
                    aria-current={active ? "true" : undefined}
                    className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1 text-center"
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ring-inset ${
                        active ? "bg-[#0d0f0c] text-[#C2A05A] ring-[#0d0f0c]" : "bg-[#FBF6EA] text-[#77591B] ring-[#C2A05A]/45"
                      }`}
                    >
                      <TradeIcon trade={trade} className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-stone-700">{trade}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-4 hidden sm:block">
          <ListStrip listHref={listHrefFor(search)} mode={contractorMode ? "sub" : "pro"} />
        </div>

        {liveTrades.length > 0 ? (
          <section aria-label="Trades and cities with listings" className="mt-6 hidden space-y-3 sm:block">
            <div className="flex items-center gap-3">
              <p className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Trades</p>
              <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible">
                {liveTrades.map(({ trade, count }) => (
                  <Chip
                    key={trade}
                    href={directorySearchHref({ ...search, trade: search.trade === trade ? null : trade, page: 1 })}
                    count={count}
                    active={search.trade === trade}
                    track="dir-chip-trade"
                    trade={trade}
                  >
                    {trade}
                  </Chip>
                ))}
              </div>
            </div>
            {liveCities.length > 0 ? (
              <div className="flex items-center gap-3">
                <p className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Cities</p>
                <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible">
                  {liveCities.map((city) => (
                    <Chip key={`${city.state}-${city.slug}`} href={directoryCityPath(city.state, city.label)} count={city.count} track="dir-chip-city">
                      {city.label}, {city.state}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mt-5 grid gap-8 sm:mt-8 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:items-start xl:grid-cols-[15.5rem_minmax(0,1fr)_17.5rem]">
        <aside aria-label="Why list your business here" className="hidden xl:sticky xl:top-24 xl:block">
          <ListValueRail />
        </aside>
        <section aria-labelledby="directory-results-heading">
          {!result.available ? (
            <div role="status" className={`px-6 py-10 text-center ${dirPanel}`}>
              <h2 id="directory-results-heading" className="text-lg font-semibold text-[#0A0A0A]">
                The directory could not be loaded just now.
              </h2>
              <p className="mt-2 text-sm text-stone-600">Please try again in a minute. Nothing you did caused this.</p>
              <Link href={directorySearchHref(search)} className={`mt-5 ${dirSecondaryButton}`}>
                Try again
              </Link>
            </div>
          ) : result.total === 0 ? (
            <div className={`overflow-hidden ${dirPanel}`}>
              <div className="grid gap-6 px-6 py-10 sm:px-10 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF6EA] ring-1 ring-inset ring-[#C2A05A]/40">
                  <SearchX aria-hidden="true" className="h-6 w-6 text-[#77591B]" />
                </span>
                <div>
                  <h2 id="directory-results-heading" className="text-xl font-semibold tracking-tight text-[#0A0A0A] sm:text-2xl">
                    {filtered ? emptyHeading(search) : "The directory is new. Be one of the first businesses listed."}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
                    {filtered
                      ? "No business matches that search yet. If you run one, your listing would be the first thing people find here. If you are looking for a pro, try a wider search or a nearby city."
                      : "No businesses are listed yet. Listing is free, takes about two minutes, and a person checks it before it shows."}
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link href={listHrefFor(search)} data-track="dir-empty-list" className={dirBrassButton}>
                      List your business free <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                    {filtered ? (
                      <Link href={DIRECTORY_PATH} className={dirSecondaryButton}>
                        See every listing
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 id="directory-results-heading" aria-live="polite" className="text-sm font-semibold text-stone-800">
                  {describeResults(search, result.total)}
                </h2>
                {showsMembers ? <p className="text-xs text-stone-500">{DIRECTORY_MEMBER_LABEL}s are listed first.</p> : null}
              </div>
              <ShowMoreList
                restCount={Math.max(0, result.listings.length - DIR_PHONE_FIRST)}
                className="mt-3 grid gap-2 sm:mt-4 sm:gap-3 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2"
              >
                {result.listings.map((listing, index) => (
                  <Fragment key={listing.slug}>
                    <ListingResultCard listing={listing} quotes={quotesOn} itemClassName={index >= DIR_PHONE_FIRST ? dirShowMoreRest : ""} />
                    {/* Tablets have no sidebar: the card sits after the third business instead. Phones get the strip below. */}
                    {index === 2 && result.listings.length > 3 ? (
                      <li className="hidden sm:block md:col-span-2 lg:hidden">
                        <ListSideCard listHref={listHrefFor(search)} mode={contractorMode ? "sub" : "pro"} />
                      </li>
                    ) : null}
                  </Fragment>
                ))}
              </ShowMoreList>
              {pages > 1 ? (
                <nav aria-label="Pages of results" className="mt-6 flex items-center justify-between gap-4">
                  {page > 1 ? (
                    <Link href={directorySearchHref({ ...search, page: page - 1 })} rel="prev" className={dirSecondaryButton}>
                      Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <p className="text-sm text-stone-600">
                    Page {page} of {pages}
                  </p>
                  {page < pages ? (
                    <Link href={directorySearchHref({ ...search, page: page + 1 })} rel="next" className={dirSecondaryButton}>
                      Next
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </>
          )}
        </section>

        <aside aria-label="List your business" className="hidden space-y-3 lg:sticky lg:top-24 lg:block">
          <ListSideCard listHref={listHrefFor(search)} mode={contractorMode ? "sub" : "pro"} />
          <p className={`px-5 py-4 text-sm text-stone-600 ${dirPanel}`}>
            Already listed?{" "}
            <Link href="/directory/manage" className={dirLink}>
              Manage your listing
            </Link>
          </p>
        </aside>
        </div>

        {/* Phone: a slim strip, and the reasons folded away until asked for. */}
        <div className="mt-6 space-y-2 sm:hidden">
          <ListStrip listHref={listHrefFor(search)} mode={contractorMode ? "sub" : "pro"} />
          <details className="group rounded-xl border border-stone-200 bg-white px-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-stone-800">
              Why list here
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="pb-4">
              <ListValueRail />
            </div>
          </details>
        </div>

        {/* Below xl there is no left column: the reasons show as the band instead (not on a phone). */}
        <div className="hidden sm:block xl:hidden">
          <ListFreeBand />
        </div>

        <p className="mt-8 text-xs leading-relaxed text-stone-500">
          Listings come from the businesses themselves, or are added with their permission, and are checked by a person before they show. We do not verify
          licenses or insurance: confirm those with the contractor.{" "}
          {showsMembers ? `“${DIRECTORY_MEMBER_LABEL}”: ${DIRECTORY_MEMBER_MEANING} ` : ""}
          <Link href="/directory/manage" className={dirLink}>
            Manage your listing
          </Link>
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
