import type { Metadata } from "next";
import Link from "next/link";
import { searchPublicListings } from "@/lib/directory/listings";
import {
  dirBadge,
  dirCard,
  dirEyebrow,
  dirInput,
  dirLabel,
  dirLink,
  dirPrimaryButton,
  dirSecondaryButton,
} from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  DIRECTORY_LIST_PATH,
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_PATH,
  DIRECTORY_TRADES,
  US_STATES,
  directoryListingPath,
  directorySearchHref,
  formatPhone,
  hasActiveSearch,
  parseDirectorySearch,
  stateName,
  type DirectoryPublicListing,
  type DirectorySearch,
} from "@/shared/types/directory";

/**
 * The public contractor directory: search published listings by trade and
 * place. No account, nothing to sign in to.
 *
 * The search is a plain GET form, so a search is a link someone can send,
 * the back button works, and the page works without JavaScript. Results come
 * from the database function that returns published listings' public
 * columns only (lib/directory/listings.ts).
 *
 * The page never claims a size. It says how many listings matched, and when
 * there are none it says so and offers the one useful next step.
 */

const TITLE = "Contractor directory";
const DESCRIPTION =
  "Find HVAC, plumbing, electrical and other trade contractors and subcontractors by trade and city. Free to search, and free to list your business. No account needed.";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const search = parseDirectorySearch(await searchParams);
  const filtered = hasActiveSearch(search) || search.page > 1;
  return {
    title: TITLE,
    description: DESCRIPTION,
    ...buildPublicSocialMetadata({ path: DIRECTORY_PATH, title: TITLE, description: DESCRIPTION }),
    // A filtered or paged view is the same directory, sliced: one page is
    // enough for a search engine, and its address is /directory.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

function describeResults(search: DirectorySearch, total: number): string {
  const count = `${total} ${total === 1 ? "listing" : "listings"}`;
  const what = search.trade ? ` for ${search.trade}` : "";
  const where = search.place
    ? ` near "${search.place}"${search.state ? `, ${stateName(search.state)}` : ""}`
    : search.state
      ? ` in ${stateName(search.state)}`
      : "";
  const sub = search.subOnly ? " that take subcontract work" : "";
  return `${count}${what}${where}${sub}`;
}

function ListingRow({ listing }: { readonly listing: DirectoryPublicListing }) {
  const href = directoryListingPath(listing.slug);
  return (
    <li>
      <article className={`px-5 py-5 sm:flex sm:items-start sm:justify-between sm:gap-8 sm:px-6 ${dirCard}`}>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
            <Link href={href} className="inline-block rounded-sm py-0.5 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40">
              {listing.businessName}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {listing.tradeType} · {listing.city}, {listing.state}
          </p>
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-stone-700">{listing.description}</p>
          {listing.acceptsSubWork || listing.serviceArea ? (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500">
              {listing.acceptsSubWork ? <span className={dirBadge}>Takes subcontract work</span> : null}
              {listing.serviceArea ? <span>Serves {listing.serviceArea}</span> : null}
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex shrink-0 items-center justify-between gap-4 border-t border-stone-100 pt-4 sm:mt-0 sm:block sm:border-0 sm:pt-0 sm:text-right">
          <a
            href={`tel:+1${listing.phone}`}
            className="inline-flex min-h-9 items-center rounded-sm text-base font-semibold tabular-nums text-[#0A0A0A] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
          >
            {formatPhone(listing.phone)}
          </a>
          <Link href={href} className={`inline-flex min-h-9 items-center text-sm sm:mt-1 sm:flex sm:justify-end ${dirLink}`}>
            View listing<span aria-hidden="true">&nbsp;→</span>
            <span className="sr-only">: {listing.businessName}</span>
          </Link>
        </div>
      </article>
    </li>
  );
}

export default async function DirectoryPage({ searchParams }: PageProps) {
  const search = parseDirectorySearch(await searchParams);
  const result = await searchPublicListings(search);
  const filtered = hasActiveSearch(search);
  const pages = Math.max(1, Math.ceil(result.total / DIRECTORY_PAGE_SIZE));
  const page = Math.min(search.page, pages);

  return (
    <ResourceChrome>
      <ResourceMain width="wide">
        <header className="sm:flex sm:items-end sm:justify-between sm:gap-8">
          <div>
            <p className={dirEyebrow}>Contractor directory</p>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
              Find a contractor or a sub.
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
              Trade businesses, listed by the people who run them. Free to search. No account.
            </p>
          </div>
          {/* A button beside the heading on a wide screen; a plain link on a
              phone, where a button would push the search down the page. */}
          <div className="hidden shrink-0 sm:block">
            <Link href={DIRECTORY_LIST_PATH} className={dirSecondaryButton}>
              List your business free
            </Link>
          </div>
          <Link href={DIRECTORY_LIST_PATH} className={`mt-2 inline-flex min-h-9 items-center text-sm sm:hidden ${dirLink}`}>
            List your business free<span aria-hidden="true">&nbsp;→</span>
          </Link>
        </header>

        <form action={DIRECTORY_PATH} method="get" role="search" aria-label="Search the directory" className={`mt-6 px-5 py-5 sm:mt-8 sm:px-6 ${dirCard}`}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-end">
            <div className="col-span-2 lg:col-span-1">
              <label htmlFor="directory-trade" className={dirLabel}>
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
              <label htmlFor="directory-place" className={dirLabel}>
                City or ZIP
              </label>
              <input
                id="directory-place"
                name="place"
                type="text"
                defaultValue={search.place ?? ""}
                maxLength={60}
                autoComplete="off"
                className={`mt-1.5 ${dirInput}`}
              />
            </div>
            <div>
              <label htmlFor="directory-state" className={dirLabel}>
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
            <button type="submit" className={`col-span-2 lg:col-span-1 ${dirPrimaryButton}`}>
              Search
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2.5 text-sm text-stone-800">
              <input
                type="checkbox"
                name="sub"
                value="1"
                defaultChecked={search.subOnly}
                className="h-4 w-4 rounded border-stone-400 accent-[#77591B]"
              />
              Only businesses that take subcontract work
            </label>
            {filtered ? (
              <Link href={DIRECTORY_PATH} className={`inline-flex min-h-9 items-center text-sm ${dirLink}`}>
                Clear search
              </Link>
            ) : null}
          </div>
        </form>

        <section aria-labelledby="directory-results-heading" className="mt-8">
          {!result.available ? (
            <p role="status" className={`px-6 py-8 text-center text-sm text-stone-700 ${dirCard}`}>
              The directory could not be loaded just now. Please try again in a minute.
            </p>
          ) : result.total === 0 ? (
            <div className={`px-6 py-10 text-center ${dirCard}`}>
              <h2 id="directory-results-heading" className="text-lg font-semibold text-[#0A0A0A]">
                {filtered ? "No listings match that search yet." : "The directory is just opening."}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
                {filtered
                  ? "Try a wider search, or a nearby city. If you run a business like this, you can be the first one listed here."
                  : "No businesses are listed yet. If you run a trade business, you can be the first."}
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href={DIRECTORY_LIST_PATH} className={dirPrimaryButton}>
                  List your business free
                </Link>
                {filtered ? (
                  <Link href={DIRECTORY_PATH} className={dirSecondaryButton}>
                    See all listings
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <h2 id="directory-results-heading" aria-live="polite" className="text-sm font-medium text-stone-600">
                {describeResults(search, result.total)}
              </h2>
              <ul className="mt-4 space-y-3">
                {result.listings.map((listing) => (
                  <ListingRow key={listing.slug} listing={listing} />
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

        {result.total > 0 ? (
          <aside className={`mt-10 px-6 py-6 sm:flex sm:items-center sm:justify-between sm:gap-8 ${dirCard}`}>
            <div>
              <h2 className="text-base font-semibold text-[#0A0A0A]">Run a trade business?</h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                List it here free. No account, and it takes about two minutes.
              </p>
            </div>
            <Link href={DIRECTORY_LIST_PATH} className={`mt-4 shrink-0 sm:mt-0 ${dirPrimaryButton}`}>
              List your business free
            </Link>
          </aside>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-stone-500">
          Listings are written by the businesses themselves and checked by a person before they show. We do not verify
          licenses or insurance: confirm those with the contractor.{" "}
          <Link href="/directory/manage" className={dirLink}>
            Manage your listing
          </Link>
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
