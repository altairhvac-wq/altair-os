import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, MapPin, SearchX } from "lucide-react";
import {
  cityName,
  citiesWithListings,
  countBasedIn,
  isIndexableHub,
  listDirectoryFacets,
  listingsForPlace,
  tradesWithListings,
} from "@/lib/directory/places";
import { dirBrassButton, dirLink, dirPanel, dirSecondaryButton } from "@/shared/components/directory/directory-styles";
import {
  Chip,
  DirectoryBand,
  DirectoryBreadcrumbs,
  ListingResultCard,
  breadcrumbJsonLd,
  itemListJsonLd,
  type Crumb,
} from "@/shared/components/directory/DirectoryUi";
import { ListFreeBand } from "@/shared/components/directory/DirectoryPitch";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  DIRECTORY_LIST_PATH,
  DIRECTORY_MEMBER_LABEL,
  DIRECTORY_MEMBER_MEANING,
  DIRECTORY_PATH,
  directoryCityPath,
  directoryCityTradePath,
  directorySearchHref,
  directoryStatePath,
  stateName,
} from "@/shared/types/directory";
import type { TradeType } from "@/shared/types/network";

/**
 * A state, city or city-and-trade page of the directory:
 *   /directory/ut, /directory/ut/salt-lake-city, /directory/ut/salt-lake-city/hvac
 *
 * Built from the published listings and nothing else. It shows the
 * businesses based there, the ones whose service area names the place, the
 * other cities and trades that have listings, a short guide to choosing a
 * contractor and plain answers about how the directory works. Nothing here
 * is a local fact we have not checked: no prices, no permit rules, no
 * "best" or "top".
 *
 * Indexing: a page is noindex, and out of the sitemap, until at least
 * DIRECTORY_HUB_INDEX_MIN businesses are based there (`isIndexableHub`;
 * shared/types/directory.ts explains why). A city with no business based in it is a 404
 * rather than an empty page; a trade with none in a city that has other
 * businesses shows an honest "be the first" page, kept out of the index.
 */

export type HubPlace = { state: string; citySlug: string | null; trade: TradeType | null };

type ResolvedHub = {
  place: HubPlace;
  city: string | null;
  basedCount: number;
  indexable: boolean;
  path: string;
  heading: string;
  placeLabel: string;
};

function tradeNoun(trade: TradeType | null): string {
  if (!trade) return "Trade businesses";
  if (trade === "Other") return "Other trade businesses";
  return /services$/i.test(trade) ? `${trade} companies` : `${trade} contractors`;
}

/** Works out the page, or null when it should be a 404. */
export async function resolveHub(place: HubPlace): Promise<ResolvedHub | null> {
  const { facets, available } = await listDirectoryFacets();
  if (!available) return null;
  let city: string | null = null;
  if (place.citySlug) {
    city = cityName(facets, place.state, place.citySlug);
    if (!city) return null;
  }
  const basedCount = countBasedIn(facets, { state: place.state, citySlug: place.citySlug, trade: place.trade });
  const placeLabel = city ? `${city}, ${place.state}` : stateName(place.state);
  const path = city
    ? place.trade
      ? directoryCityTradePath(place.state, city, place.trade)
      : directoryCityPath(place.state, city)
    : directoryStatePath(place.state);
  return {
    place,
    city,
    basedCount,
    indexable: isIndexableHub(basedCount),
    path,
    heading: `${tradeNoun(place.trade)} in ${placeLabel}`,
    placeLabel,
  };
}

export async function hubMetadata(place: HubPlace): Promise<Metadata> {
  const hub = await resolveHub(place);
  if (!hub) return { title: "Not found", robots: { index: false, follow: false } };
  const description =
    hub.basedCount > 0
      ? `${hub.basedCount} ${hub.basedCount === 1 ? "business" : "businesses"} based in ${hub.placeLabel}, each listed by its owner and checked by a person. Call them directly. Free to search, free to list.`
      : `Trade businesses in ${hub.placeLabel}, listed by their owners and checked by a person. Free to list your business.`;
  return {
    title: hub.heading,
    description,
    ...buildPublicSocialMetadata({ path: hub.path, title: hub.heading, description }),
    ...(hub.indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

function trailFor(hub: ResolvedHub): Crumb[] {
  const trail: Crumb[] = [
    { label: "Directory", href: DIRECTORY_PATH },
    { label: stateName(hub.place.state), href: directoryStatePath(hub.place.state) },
  ];
  if (hub.city) trail.push({ label: hub.city, href: directoryCityPath(hub.place.state, hub.city) });
  if (hub.city && hub.place.trade) trail.push({ label: hub.place.trade, href: hub.path });
  // The last crumb is this page.
  trail[trail.length - 1] = { label: trail[trail.length - 1].label };
  return trail;
}

function faqFor(hub: ResolvedHub): { q: string; a: React.ReactNode }[] {
  const where = hub.city ?? stateName(hub.place.state);
  const noun = hub.place.trade ? `${hub.place.trade} ` : "";
  return [
    {
      q: `How do businesses get on this page?`,
      a: `Each business listed itself, or was added after it gave us permission, and a person read the listing before it went live. Nothing is copied in from public records, and a business can edit or remove its listing at any time.`,
    },
    {
      q: `Does the directory check licenses or insurance?`,
      a: `No. A license number on a listing is what the business entered, and "insured" is the business's own statement. Before you hire, look the license up with ${stateName(hub.place.state)}'s contractor licensing office and ask for a certificate of insurance.`,
    },
    {
      q: `What does it cost?`,
      a: `Nothing, either way. Searching is free and so is listing a business: no subscription and no lead fees. You call the business directly.`,
    },
    {
      q: `How do I list my ${noun}business in ${where}?`,
      a: (
        <>
          Use the{" "}
          <Link href={DIRECTORY_LIST_PATH} className={dirLink}>
            free listing form
          </Link>
          . The first step asks for five things and takes about two minutes. After you confirm your email, a person checks
          the listing, usually within one business day.
        </>
      ),
    },
  ];
}

const CHOOSING: readonly string[] = [
  "Ask for a written estimate that says what is included, and get more than one for a big job.",
  "Check the license with your state's licensing office, and ask for proof of insurance.",
  "Ask what the warranty covers: the parts, the work, and for how long.",
  "Agree on start and finish dates, and how changes to the job are priced.",
];

export async function DirectoryHubPage({ place }: { readonly place: HubPlace }) {
  const hub = await resolveHub(place);
  // The caller has already turned a null into notFound(); this is a guard.
  if (!hub) return null;
  const { facets } = await listDirectoryFacets();
  const listings = await listingsForPlace({ state: place.state, city: hub.city, trade: place.trade });
  const trail = trailFor(hub);

  const trades = tradesWithListings(facets, { state: place.state, citySlug: place.citySlug });
  const cities = citiesWithListings(facets, { state: place.state, trade: place.trade }).filter((city) => city.slug !== place.citySlug).slice(0, 18);
  const showsMembers = listings.based.some((listing) => listing.isMember);
  const listHref = `${DIRECTORY_LIST_PATH}?${new URLSearchParams({
    ...(place.trade ? { trade: place.trade } : {}),
    ...(hub.city ? { city: hub.city } : {}),
    state: place.state,
  }).toString()}`;

  return (
    <ResourceChrome>
      <JsonLdScript data={breadcrumbJsonLd(PUBLIC_SITE_ORIGIN, trail.map((crumb, index) => (index === trail.length - 1 ? { label: crumb.label } : crumb)), hub.path)} />
      {listings.based.length > 0 ? <JsonLdScript data={itemListJsonLd(PUBLIC_SITE_ORIGIN, hub.heading, listings.based)} /> : null}
      <ResourceMain width="app">
        <DirectoryBand>
          <DirectoryBreadcrumbs trail={trail} tone="dark" />
          <h1 className="mt-4 max-w-3xl text-[2rem] font-semibold leading-[1.1] tracking-tight text-[#fff9ea] sm:text-[2.75rem]">{hub.heading}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#cfc6b6] sm:text-lg">
            {hub.basedCount > 0
              ? `${hub.basedCount} ${hub.basedCount === 1 ? "business is" : "businesses are"} based ${hub.city ? `in ${hub.city}` : `in ${stateName(place.state)}`}. Each one is listed by its owner or with its permission, and was checked by a person. Call them directly; there is no middleman and no lead fee.`
              : `No ${place.trade ?? "trade"} business based in ${hub.placeLabel} is listed yet.`}
          </p>
          {trades.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {hub.city ? (
                <Chip href={directoryCityPath(place.state, hub.city)} active={!place.trade} track="dir-chip-trade" tone="dark">
                  All trades
                </Chip>
              ) : null}
              {trades.map(({ trade, count }) => (
                <Chip
                  key={trade}
                  href={hub.city ? directoryCityTradePath(place.state, hub.city, trade) : directorySearchHref({ trade, state: place.state })}
                  count={count}
                  active={place.trade === trade}
                  track="dir-chip-trade"
                  tone="dark"
                >
                  {trade}
                </Chip>
              ))}
            </div>
          ) : null}
        </DirectoryBand>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <section aria-labelledby="hub-results-heading">
              {!listings.available ? (
                <p role="status" className={`px-6 py-8 text-center text-sm text-stone-700 ${dirPanel}`}>
                  The listings could not be loaded just now. Please try again in a minute.
                </p>
              ) : listings.based.length === 0 ? (
                <div className={`px-6 py-10 sm:px-8 ${dirPanel}`}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF6EA] ring-1 ring-inset ring-[#C2A05A]/40">
                    <SearchX aria-hidden="true" className="h-5 w-5 text-[#77591B]" />
                  </span>
                  <h2 id="hub-results-heading" className="mt-4 text-xl font-semibold tracking-tight text-[#0A0A0A]">
                    Be the first {place.trade ?? "trade"} business listed in {hub.city ?? stateName(place.state)}.
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
                    Listing is free, there are no lead fees, and a person checks it before it shows.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link href={listHref} data-track="dir-empty-list" className={dirBrassButton}>
                      List your business free <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                    <Link href={DIRECTORY_PATH} className={dirSecondaryButton}>
                      Search the directory
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h2 id="hub-results-heading" className="text-sm font-semibold text-stone-800">
                      Based {hub.city ? `in ${hub.city}` : `in ${stateName(place.state)}`}
                    </h2>
                    {showsMembers ? <p className="text-xs text-stone-500">{DIRECTORY_MEMBER_LABEL}s are listed first.</p> : null}
                  </div>
                  <ul className="mt-4 grid gap-3 md:grid-cols-2">
                    {listings.based.map((listing) => (
                      <ListingResultCard key={listing.slug} listing={listing} showCity={!hub.city} />
                    ))}
                  </ul>
                </>
              )}
              {listings.alsoServing.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-sm font-semibold text-stone-800">Based nearby, serving {hub.city}</h2>
                  <ul className="mt-4 grid gap-3 md:grid-cols-2">
                    {listings.alsoServing.slice(0, 6).map((listing) => (
                      <ListingResultCard key={listing.slug} listing={listing} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <section aria-labelledby="hub-choosing-heading" className={`mt-10 px-5 py-6 sm:px-7 ${dirPanel}`}>
              <h2 id="hub-choosing-heading" className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                Choosing {place.trade ? `a ${place.trade} contractor` : "a contractor"} {hub.city ? `in ${hub.city}` : `in ${stateName(place.state)}`}
              </h2>
              <ul className="mt-4 space-y-3">
                {CHOOSING.map((line) => (
                  <li key={line} className="flex gap-3 text-sm leading-relaxed text-stone-700">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#A4823A]" />
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="hub-faq-heading" className="mt-10">
              <h2 id="hub-faq-heading" className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                Questions
              </h2>
              <div className={`mt-4 divide-y divide-stone-100 ${dirPanel}`}>
                {faqFor(hub).map((item) => (
                  <details key={item.q} className="group px-5 py-1 sm:px-6">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-stone-900">
                      {item.q}
                      <span aria-hidden="true" className="text-xl font-normal text-stone-400 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="pb-4 text-sm leading-relaxed text-stone-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {cities.length > 0 ? (
              <div className={`px-5 py-5 ${dirPanel}`}>
                <h2 className="text-sm font-semibold text-stone-900">
                  {hub.city ? `Other cities in ${stateName(place.state)}` : `Cities in ${stateName(place.state)}`}
                </h2>
                <p className="mt-1 text-xs text-stone-500">With {place.trade ? `${place.trade} ` : ""}businesses listed</p>
                <ul className="mt-3 space-y-0.5">
                  {cities.map((city) => (
                    <li key={city.slug}>
                      <Link
                        href={place.trade ? directoryCityTradePath(city.state, city.label, place.trade) : directoryCityPath(city.state, city.label)}
                        data-track="dir-chip-city"
                        className="flex min-h-9 items-center justify-between gap-3 rounded-lg px-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                      >
                        <span className="inline-flex items-center gap-2">
                          <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-stone-400" />
                          {city.label}
                        </span>
                        <span className="text-xs tabular-nums text-stone-400">{city.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className={`px-5 py-5 ${dirPanel}`}>
              <h2 className="text-sm font-semibold text-stone-900">Run a business {hub.city ? `in ${hub.city}` : `in ${stateName(place.state)}`}?</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">Get listed free. No lead fees, and your listing links to your website.</p>
              <Link href={listHref} data-track="dir-list-cta" className={`mt-4 w-full ${dirBrassButton}`}>
                Get listed free
              </Link>
            </div>
          </aside>
        </div>

        <ListFreeBand heading={`Run a ${place.trade ?? "trade"} business ${hub.city ? `in ${hub.city}` : `in ${stateName(place.state)}`}? Get listed free.`} />

        <p className="mt-8 text-xs leading-relaxed text-stone-500">
          Listings come from the businesses themselves, or are added with their permission, and are checked by a person before they show. We do not verify
          licenses or insurance: confirm those with the contractor.{" "}
          {showsMembers ? `“${DIRECTORY_MEMBER_LABEL}”: ${DIRECTORY_MEMBER_MEANING}` : ""}
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
