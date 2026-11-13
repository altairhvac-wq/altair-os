import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicListing } from "@/lib/directory/listings";
import { ReportListingForm } from "@/shared/components/directory/DirectorySmallForms";
import {
  dirBadge,
  dirCard,
  dirEyebrow,
  dirLink,
  dirPrimaryButton,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  DIRECTORY_MANAGE_PATH,
  DIRECTORY_PATH,
  directoryListingPath,
  directorySearchHref,
  formatPhone,
  stateName,
  websiteLabel,
} from "@/shared/types/directory";

/**
 * One business in the public directory.
 *
 * Everything on this page was written by the business and approved by the
 * owner. The page adds nothing of its own about the business: no rating, no
 * "verified", no claim about licences. An address that is not a published
 * listing is a 404.
 */

type PageProps = { params: Promise<{ slug: string }> };

/** One read per request, shared by the metadata and the page. */
const loadListing = cache((slug: string) => getPublicListing(slug));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadListing(slug);
  // An address that is not a published listing shows the not-found page and
  // is marked noindex. Like the Insights articles, it can still answer with a
  // 200 status, because the marketing loading screen has already begun the
  // response by the time the listing is looked up; search engines drop it on
  // the noindex either way.
  if (!found) notFound();
  const { listing } = found;
  const title = `${listing.businessName}: ${listing.tradeType} in ${listing.city}, ${listing.state}`;
  const description = listing.description.replace(/\s+/g, " ").slice(0, 155);
  return {
    title,
    description,
    ...buildPublicSocialMetadata({ path: directoryListingPath(listing.slug), title, description }),
  };
}

export default async function DirectoryListingPage({ params }: PageProps) {
  const { slug } = await params;
  const found = await loadListing(slug);
  if (!found) notFound();
  const { listing } = found;
  const listedSince = listing.publishedAt
    ? new Date(listing.publishedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <ResourceChrome>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: listing.businessName,
          description: listing.description,
          telephone: `+1${listing.phone}`,
          url: `${PUBLIC_SITE_ORIGIN}${directoryListingPath(listing.slug)}`,
          ...(listing.website ? { sameAs: [listing.website] } : {}),
          address: {
            "@type": "PostalAddress",
            addressLocality: listing.city,
            addressRegion: listing.state,
            ...(listing.postalCode ? { postalCode: listing.postalCode } : {}),
            addressCountry: "US",
          },
          ...(listing.serviceArea ? { areaServed: listing.serviceArea } : {}),
        }}
      />
      <ResourceMain>
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-stone-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={DIRECTORY_PATH} className="inline-flex min-h-8 items-center rounded-sm hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40">
                Directory
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={directorySearchHref({ trade: listing.tradeType, state: listing.state })}
                className="inline-flex min-h-8 items-center rounded-sm hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
              >
                {listing.tradeType} in {stateName(listing.state)}
              </Link>
            </li>
          </ol>
        </nav>

        <header>
          <p className={dirEyebrow}>{listing.tradeType}</p>
          <h1 className="mt-3 break-words text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem] sm:leading-[1.15]">
            {listing.businessName}
          </h1>
          <p className="mt-3 text-base text-stone-600 sm:text-lg">
            {listing.city}, {stateName(listing.state)}
          </p>
          {listing.acceptsSubWork ? (
            <p className="mt-4">
              <span className={dirBadge}>Takes subcontract work</span>
            </p>
          ) : null}
        </header>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a href={`tel:+1${listing.phone}`} className={`${dirPrimaryButton} tabular-nums`}>
            Call {formatPhone(listing.phone)}
          </a>
          {listing.website ? (
            <a href={listing.website} target="_blank" rel="noopener noreferrer nofollow ugc" className={dirSecondaryButton}>
              {websiteLabel(listing.website)}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </div>

        <section aria-labelledby="listing-about-heading" className={`mt-8 px-5 py-6 sm:px-7 ${dirCard}`}>
          <h2 id="listing-about-heading" className="text-base font-semibold text-[#0A0A0A]">
            What they do
          </h2>
          <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed text-stone-700">{listing.description}</p>
          <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-stone-100 pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-stone-500">Trade</dt>
              <dd className="mt-0.5 font-medium text-stone-900">{listing.tradeType}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Based in</dt>
              <dd className="mt-0.5 font-medium text-stone-900">
                {listing.city}, {listing.state}
                {listing.postalCode ? ` ${listing.postalCode}` : ""}
              </dd>
            </div>
            {listing.serviceArea ? (
              <div className="sm:col-span-2">
                <dt className="text-stone-500">Service area</dt>
                <dd className="mt-0.5 font-medium text-stone-900">{listing.serviceArea}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <p className="mt-5 text-xs leading-relaxed text-stone-500">
          {listedSince ? `Listed since ${listedSince}. ` : ""}
          This listing was written by the business. We do not verify licenses or insurance: confirm those with the
          contractor.
        </p>

        <div className="mt-8 grid gap-4 border-t border-stone-200 pt-6 sm:grid-cols-2">
          <details className="group text-sm">
            <summary className={`inline-flex min-h-9 cursor-pointer list-none items-center ${dirLink}`}>Report this listing</summary>
            <div className="mt-3">
              <ReportListingForm slug={listing.slug} />
            </div>
          </details>
          <p className="text-sm text-stone-600 sm:text-right">
            Is this your business?{" "}
            <Link href={DIRECTORY_MANAGE_PATH} className={`inline-flex min-h-9 items-center ${dirLink}`}>
              Edit or remove it
            </Link>
          </p>
        </div>
      </ResourceMain>
    </ResourceChrome>
  );
}
