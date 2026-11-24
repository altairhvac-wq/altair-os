import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock,
  Globe,
  Languages,
  MapPin,
  Navigation,
  Phone,
  Route,
  Send,
  ShieldCheck,
  Siren,
  Wrench,
} from "lucide-react";
import { getPublicListing, searchPublicListings } from "@/lib/directory/listings";
import { countBasedIn, isIndexableHub, listDirectoryFacets, listingsForPlace } from "@/lib/directory/places";
import { DirectoryMemberBadge } from "@/shared/components/directory/DirectoryMemberBadge";
import { DirectoryHubPage, hubMetadata, resolveHub } from "@/shared/components/directory/DirectoryHub";
import { ListFreeBand } from "@/shared/components/directory/DirectoryPitch";
import { ReportListingForm } from "@/shared/components/directory/DirectorySmallForms";
import { QuoteRequestForm } from "@/shared/components/directory/QuoteRequestForm";
import { isDirectory216Installed } from "@/lib/directory/schema";
import { ListingStatsBeacon } from "@/shared/components/directory/ListingStatsBeacon";
import {
  DirectoryBreadcrumbs,
  ListingMark,
  Tag,
  breadcrumbJsonLd,
  type Crumb,
} from "@/shared/components/directory/DirectoryUi";
import {
  dirBrassButton,
  dirFocus,
  dirLink,
  dirPanel,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  DIRECTORY_DAYS,
  DIRECTORY_MANAGE_PATH,
  DIRECTORY_MEMBER_LABEL,
  DIRECTORY_MEMBER_MEANING,
  DIRECTORY_PATH,
  directoryCityPath,
  directoryCityTradePath,
  directoryListingPath,
  directoryStatePath,
  formatPhone,
  languageLabel,
  placeSlug,
  serviceLabel,
  stateFromSegment,
  stateName,
  summarizeHours,
  websiteLabel,
  type DirectoryPublicListing,
} from "@/shared/types/directory";
import type { TradeType } from "@/shared/types/network";

/**
 * One business in the public directory, or (for a two-letter segment) a
 * state page: /directory/ut. The two share this route; a business's slug is
 * at least three characters, so the two can never be confused
 * (shared/types/directory.ts, "place and trade pages").
 *
 * Everything on a business page was written by the business and approved by
 * a person. The page adds nothing of its own about the business: no rating,
 * no "verified", no claim about licences. "Insured" is shown only as the
 * business's own statement, and says so. An address that is not a published
 * listing is a 404.
 */

type PageProps = { params: Promise<{ slug: string }> };

/** One read per request, shared by the metadata and the page. */
const loadListing = cache((slug: string) => getPublicListing(slug));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const state = stateFromSegment(slug);
  if (state) return hubMetadata({ state, citySlug: null, trade: null });
  const found = await loadListing(slug);
  // An address that is not a published listing shows the not-found page and
  // is marked noindex. Like the Insights articles, it can still answer with a
  // 200 status, because the marketing loading screen has already begun the
  // response by the time the listing is looked up; search engines drop it on
  // the noindex either way.
  if (!found) notFound();
  const { listing } = found;
  const title = `${listing.businessName}: ${listing.tradeType} in ${listing.city}, ${listing.state}`;
  const description = (listing.description || `${listing.businessName}, ${listing.tradeType.toLowerCase()} based in ${listing.city}, ${stateName(listing.state)}. Call ${formatPhone(listing.phone)}.`)
    .replace(/\s+/g, " ")
    .slice(0, 155);
  return {
    title,
    description,
    ...buildPublicSocialMetadata({ path: directoryListingPath(listing.slug), title, description }),
  };
}

/** schema.org types for the trades that have one; everything else is a LocalBusiness. */
const SCHEMA_TYPES: Partial<Record<TradeType, string>> = {
  HVAC: "HVACBusiness",
  Plumbing: "Plumber",
  Electrical: "Electrician",
  Roofing: "RoofingContractor",
  "General Contracting": "GeneralContractor",
  Painting: "HousePainter",
  Locksmith: "Locksmith",
  "Moving Services": "MovingCompany",
};

const SCHEMA_DAYS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Only fields the business gave and a person approved. Nothing inferred, no ratings. */
function localBusinessJsonLd(listing: DirectoryPublicListing) {
  const { details } = listing;
  const hours = details.hours;
  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPES[listing.tradeType] ?? "LocalBusiness",
    name: listing.businessName,
    ...(listing.description ? { description: listing.description } : {}),
    telephone: `+1${listing.phone}`,
    url: `${PUBLIC_SITE_ORIGIN}${directoryListingPath(listing.slug)}`,
    ...(listing.website ? { sameAs: [listing.website] } : {}),
    ...(listing.logoUrl ? { logo: listing.logoUrl } : {}),
    ...(listing.photoUrls.length > 0 || listing.logoUrl ? { image: [...listing.photoUrls, ...(listing.logoUrl ? [listing.logoUrl] : [])] } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.city,
      addressRegion: listing.state,
      ...(listing.postalCode ? { postalCode: listing.postalCode } : {}),
      addressCountry: "US",
    },
    ...(listing.serviceArea ? { areaServed: listing.serviceArea } : {}),
    ...(details.yearFounded ? { foundingDate: String(details.yearFounded) } : {}),
    ...(details.languages.length > 0 ? { knowsLanguage: details.languages.map(languageLabel) } : {}),
    ...(details.services.length > 0
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: details.services.map((service) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: serviceLabel(service) } })),
          },
        }
      : {}),
    ...(hours
      ? {
          openingHoursSpecification: DIRECTORY_DAYS.filter((day) => hours[day.key]).map((day) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: SCHEMA_DAYS[day.key],
            opens: hours[day.key]?.open,
            closes: hours[day.key]?.close,
          })),
        }
      : {}),
  };
}

function mapsUrl(listing: DirectoryPublicListing): string {
  const query = [listing.businessName, listing.city, listing.state, listing.postalCode].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function Fact({ icon: Icon, label, children }: { readonly icon: typeof Clock; readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-stone-900">{children}</dd>
      </div>
    </div>
  );
}

function SmallListingLink({ listing }: { readonly listing: DirectoryPublicListing }) {
  return (
    <li>
      <Link
        href={directoryListingPath(listing.slug)}
        className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-stone-50 ${dirFocus}`}
      >
        <ListingMark name={listing.businessName} logoUrl={listing.logoUrl} trade={listing.tradeType} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-stone-900">{listing.businessName}</span>
          <span className="block truncate text-xs text-stone-500">
            {listing.tradeType} · {listing.city}, {listing.state}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function DirectorySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const state = stateFromSegment(slug);
  if (state) {
    if (!(await resolveHub({ state, citySlug: null, trade: null }))) notFound();
    return <DirectoryHubPage place={{ state, citySlug: null, trade: null }} />;
  }

  const found = await loadListing(slug);
  if (!found) notFound();
  const { listing } = found;
  const { details } = listing;

  const [{ facets }, sameTrade, sameCity, quotesOn] = await Promise.all([
    listDirectoryFacets(),
    searchPublicListings({ trade: listing.tradeType, state: listing.state, place: null, subOnly: false, page: 1 }, 7),
    listingsForPlace({ state: listing.state, city: listing.city }),
    // The request form shows once migration 216 is applied.
    isDirectory216Installed(),
  ]);
  const moreInTrade = sameTrade.listings.filter((other) => other.slug !== listing.slug).slice(0, 5);
  const nearby = sameCity.based.filter((other) => other.slug !== listing.slug && other.tradeType !== listing.tradeType).slice(0, 5);

  // The breadcrumb only names place pages that search engines are shown, so
  // it never points a crawler at a page marked noindex.
  const citySlug = placeSlug(listing.city);
  const citySlugCount = countBasedIn(facets, { state: listing.state, citySlug });
  const stateCount = countBasedIn(facets, { state: listing.state });
  const cityTradeCount = countBasedIn(facets, { state: listing.state, citySlug, trade: listing.tradeType });
  const trail: Crumb[] = [{ label: "Directory", href: DIRECTORY_PATH }];
  if (isIndexableHub(stateCount)) trail.push({ label: stateName(listing.state), href: directoryStatePath(listing.state) });
  if (isIndexableHub(citySlugCount)) trail.push({ label: listing.city, href: directoryCityPath(listing.state, listing.city) });
  if (isIndexableHub(cityTradeCount)) trail.push({ label: listing.tradeType, href: directoryCityTradePath(listing.state, listing.city, listing.tradeType) });
  trail.push({ label: listing.businessName });

  const listedSince = listing.publishedAt
    ? new Date(listing.publishedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const hoursLines = details.hours ? summarizeHours(details.hours) : [];
  const hasFacts =
    details.licenseNumber !== null ||
    details.insured !== null ||
    details.yearFounded !== null ||
    details.serviceRadiusMiles !== null ||
    details.languages.length > 0 ||
    details.emergencyService !== null ||
    Boolean(listing.serviceArea);
  const [heroPhoto, ...morePhotos] = listing.photoUrls;

  const contactButtons = (layout: "stack" | "row") => (
    <div className={layout === "stack" ? "flex flex-col gap-2.5" : "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2"}>
      <a href={`tel:+1${listing.phone}`} data-track="dir-listing-call" data-listing-event="call" className={`${dirBrassButton} tabular-nums ${layout === "row" ? "px-3" : ""}`}>
        <Phone aria-hidden="true" className="h-4 w-4" />
        {layout === "row" ? "Call" : `Call ${formatPhone(listing.phone)}`}
      </a>
      {listing.website ? (
        // A followed link: every published listing was checked by a person,
        // so the link is vouched for, not anonymous user content. The
        // referrer is kept so the business can see the visit came from here.
        <a
          href={listing.website}
          target="_blank"
          rel="noopener"
          data-track="dir-listing-website"
          data-listing-event="website"
          className={`${dirSecondaryButton} gap-2 ${layout === "row" ? "px-3" : ""}`}
        >
          <Globe aria-hidden="true" className="h-4 w-4" />
          {layout === "row" ? "Website" : websiteLabel(listing.website)}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
      {/* On the phone bar, "Quote" takes the map's place: the form is far down the page there. */}
      {layout === "row" && quotesOn ? (
        <a href="#request" data-track="dir-bar-quote" className={`${dirSecondaryButton} gap-2 px-3`}>
          <Send aria-hidden="true" className="h-4 w-4" />
          Quote
        </a>
      ) : (
      <a
        href={mapsUrl(listing)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        data-track="dir-listing-directions"
        data-listing-event="directions"
        className={`${dirSecondaryButton} gap-2 ${layout === "row" ? "px-3" : ""}`}
      >
        <Navigation aria-hidden="true" className="h-4 w-4" />
        {layout === "row" ? "Map" : "Find on a map"}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      )}
    </div>
  );

  return (
    <ResourceChrome>
      <ListingStatsBeacon slug={listing.slug} />
      <JsonLdScript data={localBusinessJsonLd(listing)} />
      <JsonLdScript data={breadcrumbJsonLd(PUBLIC_SITE_ORIGIN, trail, directoryListingPath(listing.slug))} />
      <ResourceMain width="app">
        <DirectoryBreadcrumbs trail={trail} />

        <div className="mt-4 grid gap-8 pb-20 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0">
          <div className="min-w-0">
            <header className={`overflow-hidden ${dirPanel}`}>
              {heroPhoto ? (
                <div className="aspect-[21/9] w-full overflow-hidden bg-stone-100">
                  {/* The business's own approved photo, served from our storage. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroPhoto} alt={`Work by ${listing.businessName}`} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div aria-hidden="true" className="h-20 bg-[#0d0f0c] sm:h-24" style={{ backgroundImage: "radial-gradient(40rem 10rem at 80% -20%, rgba(194,160,90,0.28), transparent 60%)" }} />
              )}
              <div className="px-5 pb-6 sm:px-7">
                <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
                  <span className="rounded-2xl bg-white p-1 shadow-sm">
                    <ListingMark name={listing.businessName} logoUrl={listing.logoUrl} trade={listing.tradeType} size="lg" />
                  </span>
                  <div className="min-w-0 pb-1">
                    <h1 className="break-words text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#0A0A0A] sm:text-[2.25rem]">
                      {listing.businessName}
                    </h1>
                  </div>
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#77591B]">
                    <Wrench aria-hidden="true" className="h-4 w-4" />
                    {listing.tradeType}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin aria-hidden="true" className="h-4 w-4 text-stone-400" />
                    {listing.city}, {stateName(listing.state)}
                  </span>
                  {details.yearFounded ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="h-4 w-4 text-stone-400" />
                      In business since {details.yearFounded}
                    </span>
                  ) : null}
                </p>
                {listing.isMember || listing.acceptsSubWork || details.emergencyService ? (
                  <p className="mt-4 flex flex-wrap items-center gap-2">
                    {listing.isMember ? <DirectoryMemberBadge /> : null}
                    {details.emergencyService ? (
                      <Tag tone="alert">
                        <Siren aria-hidden="true" className="h-3 w-3" /> Emergency service
                      </Tag>
                    ) : null}
                    {listing.acceptsSubWork ? <Tag tone="brass">Takes subcontract work</Tag> : null}
                  </p>
                ) : null}
              </div>
              {listing.awaitingOwnerConfirmation ? (
                <p className="flex flex-wrap items-center justify-between gap-2 border-t border-[#C2A05A]/30 bg-[#FBF6EA] px-5 py-3 text-sm text-[#5c4614] sm:px-7">
                  <span>Is this your business? Confirm or edit your listing.</span>
                  <Link href={DIRECTORY_MANAGE_PATH} data-track="dir-listing-claim" className={`inline-flex min-h-9 items-center gap-1 font-semibold ${dirLink}`}>
                    Confirm or edit <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </p>
              ) : null}
            </header>

            {listing.description ? (
              <section aria-labelledby="listing-about-heading" className={`mt-5 px-5 py-6 sm:px-7 ${dirPanel}`}>
                <h2 id="listing-about-heading" className="text-base font-semibold text-[#0A0A0A]">
                  About {listing.businessName}
                </h2>
                <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-stone-700">{listing.description}</p>
              </section>
            ) : null}

            {details.services.length > 0 ? (
              <section aria-labelledby="listing-services-heading" className={`mt-5 px-5 py-6 sm:px-7 ${dirPanel}`}>
                <h2 id="listing-services-heading" className="flex items-center gap-2 text-base font-semibold text-[#0A0A0A]">
                  <Wrench aria-hidden="true" className="h-4 w-4 text-[#A4823A]" /> Services
                </h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {details.services.map((service) => (
                    <li key={service} className="flex items-center gap-2.5 rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800">
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#A4823A]" />
                      {serviceLabel(service)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {morePhotos.length > 0 ? (
              <section aria-labelledby="listing-photos-heading" className="mt-5">
                <h2 id="listing-photos-heading" className="sr-only">
                  Photos
                </h2>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {morePhotos.map((url, index) => (
                    <li key={url} className="aspect-[4/3] overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Work by ${listing.businessName}, photo ${index + 2}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasFacts ? (
              <section aria-labelledby="listing-facts-heading" className={`mt-5 px-5 py-6 sm:px-7 ${dirPanel}`}>
                <h2 id="listing-facts-heading" className="text-base font-semibold text-[#0A0A0A]">
                  Details from the business
                </h2>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  {listing.serviceArea ? (
                    <Fact icon={MapPin} label="Cities and areas served">
                      {listing.serviceArea}
                    </Fact>
                  ) : null}
                  {details.serviceRadiusMiles ? (
                    <Fact icon={Route} label="Travels up to">
                      {details.serviceRadiusMiles} miles from {listing.city}
                    </Fact>
                  ) : null}
                  {details.licenseNumber ? (
                    <Fact icon={BadgeCheck} label={`License (${details.licenseState ?? listing.state})`}>
                      <span className="font-mono">{details.licenseNumber}</span>
                      <span className="mt-0.5 block text-xs font-normal text-stone-500">As entered by the business. Look it up with the state before you hire.</span>
                    </Fact>
                  ) : null}
                  {details.insured !== null ? (
                    <Fact icon={ShieldCheck} label="Insurance">
                      {details.insured ? "Says it is insured" : "Says it is not insured"}
                      <span className="mt-0.5 block text-xs font-normal text-stone-500">The business&apos;s own statement. Ask for a certificate.</span>
                    </Fact>
                  ) : null}
                  {details.emergencyService !== null ? (
                    <Fact icon={Siren} label="Emergency service">
                      {details.emergencyService ? "Yes, takes emergency calls" : "No emergency calls"}
                    </Fact>
                  ) : null}
                  {details.yearFounded ? (
                    <Fact icon={CalendarDays} label="Founded">
                      {details.yearFounded}
                    </Fact>
                  ) : null}
                  {details.languages.length > 0 ? (
                    <Fact icon={Languages} label="Languages">
                      {details.languages.map(languageLabel).join(", ")}
                    </Fact>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <p className="mt-5 text-xs leading-relaxed text-stone-500">
              {listedSince ? `Listed since ${listedSince}. ` : ""}
              The details come from the business and were checked by a person before they showed. We do not verify
              licenses or insurance: confirm those with the contractor.
              {listing.isMember ? ` “${DIRECTORY_MEMBER_LABEL}”: ${DIRECTORY_MEMBER_MEANING}` : ""}
            </p>

            {moreInTrade.length > 0 || nearby.length > 0 ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {moreInTrade.length > 0 ? (
                  <section aria-labelledby="listing-more-heading" className={`px-4 py-4 ${dirPanel}`}>
                    <h2 id="listing-more-heading" className="px-2 text-sm font-semibold text-stone-900">
                      More {listing.tradeType} in {stateName(listing.state)}
                    </h2>
                    <ul className="mt-2">
                      {moreInTrade.map((other) => (
                        <SmallListingLink key={other.slug} listing={other} />
                      ))}
                    </ul>
                  </section>
                ) : null}
                {nearby.length > 0 ? (
                  <section aria-labelledby="listing-nearby-heading" className={`px-4 py-4 ${dirPanel}`}>
                    <h2 id="listing-nearby-heading" className="px-2 text-sm font-semibold text-stone-900">
                      Other businesses in {listing.city}
                    </h2>
                    <ul className="mt-2">
                      {nearby.map((other) => (
                        <SmallListingLink key={other.slug} listing={other} />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-2">
              <details className="group text-sm">
                <summary className={`inline-flex min-h-9 cursor-pointer list-none items-center ${dirLink}`}>Report this listing</summary>
                <div className="mt-3">
                  <ReportListingForm slug={listing.slug} />
                </div>
              </details>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className={`px-5 py-5 ${dirPanel}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Contact</p>
              <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[#0A0A0A]">{formatPhone(listing.phone)}</p>
              <div className="mt-4">{contactButtons("stack")}</div>
              <p className="mt-4 text-xs leading-relaxed text-stone-500">You call the business directly.</p>
            </div>

            {quotesOn ? (
              <QuoteRequestForm
                slug={listing.slug}
                businessName={listing.businessName}
                phoneDisplay={formatPhone(listing.phone)}
                acceptsSubWork={listing.acceptsSubWork}
              />
            ) : null}

            {hoursLines.length > 0 ? (
              <div className={`px-5 py-5 ${dirPanel}`}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <Clock aria-hidden="true" className="h-4 w-4 text-[#A4823A]" /> Hours
                </h2>
                <dl className="mt-3 space-y-1.5 text-sm">
                  {hoursLines.map((line) => (
                    <div key={line.days} className="flex justify-between gap-4">
                      <dt className="text-stone-500">{line.days}</dt>
                      <dd className={`tabular-nums ${line.time === "Closed" ? "text-stone-400" : "font-medium text-stone-900"}`}>{line.time}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] text-stone-400">Local time, as given by the business.</p>
              </div>
            ) : null}

            <div
              className={
                listing.awaitingOwnerConfirmation
                  ? "rounded-2xl border border-[#C2A05A]/50 bg-[#FBF6EA] px-5 py-5"
                  : "rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-5 py-5"
              }
            >
              <h2 className="text-sm font-semibold text-stone-900">Is this your business?</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                {listing.awaitingOwnerConfirmation
                  ? "Confirm or edit your listing, add photos and hours, or take it down. We emailed you a link."
                  : "Edit the details, add photos and hours, see how many people viewed it, or take it down."}
              </p>
              <Link href={DIRECTORY_MANAGE_PATH} data-track="dir-listing-claim" className={`mt-3 inline-flex min-h-9 items-center gap-1 text-sm ${dirLink}`}>
                {listing.awaitingOwnerConfirmation ? "Confirm or edit your listing" : "Manage this listing"} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>

        <ListFreeBand heading={`Run a ${listing.tradeType} business? Get listed free.`} />
      </ResourceMain>
      {/* Room under the footer for the phone contact bar. */}
      <div aria-hidden="true" className="h-16 lg:hidden" />

      {/* On a phone, the ways to reach the business stay on screen. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-xl">{contactButtons("row")}</div>
      </div>
    </ResourceChrome>
  );
}
