import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, HardHat, Home, Search, SearchX } from "lucide-react";
import { searchPublicListings } from "@/lib/directory/listings";
import { isDirectory216Installed } from "@/lib/directory/schema";
import { citiesWithListings, listDirectoryFacets, tradesWithListings } from "@/lib/directory/places";
import {
  dirBrassButton,
  dirFocus,
  dirInput,
  dirLink,
  dirPanel,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import {
  Chip,
  DirectoryBand,
  ListingResultCard,
  breadcrumbJsonLd,
  itemListJsonLd,
} from "@/shared/components/directory/DirectoryUi";
import { ListFreeBand, ListSideCard, ListStrip, ListValueRail } from "@/shared/components/directory/DirectoryPitch";
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
              <p className="mt-2 text-sm leading-relaxed text-[#cfc6b6] sm:text-[15px]">
                Listed by the owner or with permission, checked by a person. Free to search, no account.
              </p>
            </div>
            <div>
              {/* Two links, so each view is its own address someone can send. */}
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
            className="mt-5 rounded-2xl bg-white p-2.5 text-stone-900 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)] sm:p-3"
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
        </DirectoryBand>

        <div className="mt-4">
          <ListStrip listHref={listHrefFor(search)} mode={contractorMode ? "sub" : "pro"} />
        </div>

        {liveTrades.length > 0 ? (
          <section aria-label="Trades and cities with listings" className="mt-6 space-y-3">
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:items-start xl:grid-cols-[15.5rem_minmax(0,1fr)_17.5rem]">
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
              <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                {result.listings.map((listing, index) => (
                  <Fragment key={listing.slug}>
                    <ListingResultCard listing={listing} quotes={quotesOn} />
                    {/* Phones have no sidebar: the card sits after the third business instead. */}
                    {index === 2 && result.listings.length > 3 ? (
                      <li className="md:col-span-2 lg:hidden">
                        <ListSideCard listHref={listHrefFor(search)} mode={contractorMode ? "sub" : "pro"} />
                      </li>
                    ) : null}
                  </Fragment>
                ))}
              </ul>
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

        {/* Below xl there is no left column: the reasons show as the band instead. */}
        <div className="xl:hidden">
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
