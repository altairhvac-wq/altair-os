import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, Siren } from "lucide-react";
import { DirectoryMemberBadge } from "@/shared/components/directory/DirectoryMemberBadge";
import { dirFocus } from "@/shared/components/directory/directory-styles";
import { TradeIcon } from "@/shared/components/directory/trade-icons";
import {
  directoryListingPath,
  formatPhone,
  serviceLabel,
  type DirectoryPublicListing,
} from "@/shared/types/directory";

/**
 * Pieces every public directory page shares: the business's mark (its logo,
 * or its initials when it has not added one), a result card, a chip, and the
 * dark band the pages open with. Server components; nothing here runs in the
 * browser.
 *
 * Everything shown about a business is what it wrote and a person approved.
 * Nothing here adds a rating, a "verified" or a "top" of its own.
 */

/** Two letters from the name, for a business without a logo. */
export function initialsOf(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9& ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !/^(llc|inc|co|the|and|&)$/i.test(word));
  const letters = (words.length >= 2 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? name).slice(0, 2)) || "?";
  return letters.toUpperCase();
}

export function ListingMark({
  name,
  logoUrl,
  size = "md",
  trade = null,
}: {
  readonly name: string;
  readonly logoUrl: string | null;
  readonly size?: "sm" | "md" | "lg";
  /** Without a logo, the mark shows this trade's icon in brass; without a trade, the initials. */
  readonly trade?: string | null;
}) {
  const box = size === "lg" ? "h-20 w-20 rounded-2xl text-2xl sm:h-24 sm:w-24" : size === "sm" ? "h-10 w-10 rounded-lg text-sm" : "h-11 w-11 rounded-xl text-sm sm:h-14 sm:w-14 sm:text-base";
  if (logoUrl) {
    return (
      <span className={`flex shrink-0 items-center justify-center overflow-hidden border border-stone-200 bg-white ${box}`}>
        {/* A business's own approved logo, served from our storage. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-contain p-1.5" loading="lazy" decoding="async" />
      </span>
    );
  }
  if (trade) {
    const icon = size === "lg" ? "h-9 w-9 sm:h-10 sm:w-10" : size === "sm" ? "h-5 w-5" : "h-6 w-6";
    return (
      <span aria-hidden="true" className={`flex shrink-0 items-center justify-center bg-[#FBF6EA] text-[#77591B] ring-1 ring-inset ring-[#C2A05A]/45 ${box}`}>
        <TradeIcon trade={trade} className={icon} strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-[#17130E] font-semibold tracking-wide text-[#E8D9AC] ring-1 ring-inset ring-[#C2A05A]/30 ${box}`}
    >
      {initialsOf(name)}
    </span>
  );
}

export function Tag({ children, tone = "plain" }: { readonly children: React.ReactNode; readonly tone?: "plain" | "brass" | "alert" }) {
  const tones = {
    plain: "border-stone-200 bg-stone-50 text-stone-700",
    brass: "border-[#C2A05A]/40 bg-[#FBF6EA] text-[#5c4614]",
    alert: "border-[#e7c9a8] bg-[#fdf6ee] text-[#7a3d10]",
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** A filter chip: a link, so a filtered view is an address someone can share. */
export function Chip({
  href,
  children,
  count,
  active = false,
  track,
  tone = "light",
  trade,
}: {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly count?: number;
  readonly active?: boolean;
  readonly track?: string;
  /** A trade chip: shows that trade's small icon before the label. */
  readonly trade?: string;
  /** "dark": the chip sits on the dark band. */
  readonly tone?: "light" | "dark";
}) {
  const look =
    tone === "dark"
      ? active
        ? "border-[#C2A05A] bg-[#A4823A] text-[#080907]"
        : "border-white/15 bg-white/[0.06] text-[#f3ebdd] hover:border-white/35"
      : active
        ? "border-[#0d0f0c] bg-[#0d0f0c] text-[#f3ebdd]"
        : "border-stone-200 bg-white text-stone-700 hover:border-[#C2A05A] hover:text-stone-900";
  const countLook = tone === "dark" ? (active ? "text-[#3b2f14]" : "text-[#a99f8f]") : active ? "text-[#C2A05A]" : "text-stone-400";
  return (
    <Link
      href={href}
      data-track={track}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${dirFocus} ${look}`}
    >
      {trade ? <ChipIcon trade={trade} active={active} dark={tone === "dark"} /> : null}
      {children}
      {typeof count === "number" ? <span className={`tabular-nums ${countLook}`}>{count}</span> : null}
    </Link>
  );
}

function ChipIcon({ trade, active, dark }: { readonly trade: string; readonly active: boolean; readonly dark: boolean }) {
  const color = active ? (dark ? "text-[#3b2f14]" : "text-[#C2A05A]") : dark ? "text-[#C2A05A]" : "text-[#A4823A]";
  return <TradeIcon trade={trade} className={`h-3.5 w-3.5 ${color}`} strokeWidth={2} />;
}

/** One business in a list of results. */
export function ListingResultCard({
  listing,
  showCity = true,
  quotes = false,
  itemClassName = "",
}: {
  readonly listing: DirectoryPublicListing;
  readonly showCity?: boolean;
  /** Extra classes on the list item (the phone "Show more" list hides some rows). */
  readonly itemClassName?: string;
  /** Migration 215 is applied: offer "Request a quote" on the card. */
  readonly quotes?: boolean;
}) {
  const href = directoryListingPath(listing.slug);
  const services = listing.details.services.slice(0, 3);
  const extra = listing.details.services.length - services.length;
  return (
    <li className={`flex ${itemClassName}`}>
      <article className="group relative flex w-full flex-col rounded-2xl border border-stone-200 bg-white p-3 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(28,25,23,0.45)] sm:p-5">
        {/* On a phone the card is one compact row: mark, name, trade and city, and a call button. */}
        <div className="flex flex-1 items-center gap-3 sm:items-start sm:gap-4">
          <ListingMark name={listing.businessName} logoUrl={listing.logoUrl} trade={listing.tradeType} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h3 className="min-w-0 break-words text-[17px] font-semibold leading-snug tracking-tight text-[#0A0A0A]">
                <Link href={href} className={`rounded-sm after:absolute after:inset-0 after:rounded-2xl ${dirFocus}`}>
                  {listing.businessName}
                </Link>
              </h3>
              {listing.isMember ? <DirectoryMemberBadge /> : null}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-stone-600">
              <span className="font-medium text-stone-800">{listing.tradeType}</span>
              {showCity ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-stone-400" />
                  {listing.city}, {listing.state}
                </span>
              ) : null}
              {listing.details.yearFounded ? (
                <span className="inline-flex items-center gap-1">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5 text-stone-400" />
                  Since {listing.details.yearFounded}
                </span>
              ) : null}
            </p>
            {listing.description ? (
              <p className="mt-2 line-clamp-2 hidden text-sm leading-relaxed text-stone-700 sm:block">{listing.description}</p>
            ) : null}
            {services.length > 0 || listing.details.emergencyService || listing.acceptsSubWork ? (
              <p className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
                {listing.details.emergencyService ? (
                  <Tag tone="alert">
                    <Siren aria-hidden="true" className="h-3 w-3" />
                    Emergency service
                  </Tag>
                ) : null}
                {listing.acceptsSubWork ? <Tag tone="brass">Takes subcontract work</Tag> : null}
                {services.map((service) => (
                  <Tag key={service}>{serviceLabel(service)}</Tag>
                ))}
                {extra > 0 ? <Tag>+{extra} more</Tag> : null}
              </p>
            ) : null}
          </div>
          <a
            href={`tel:+1${listing.phone}`}
            data-track="dir-listing-call"
            aria-label={`Call ${listing.businessName}`}
            className={`relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C2A05A]/50 bg-[#FBF6EA] text-[#77591B] sm:hidden ${dirFocus}`}
          >
            <Phone aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
        <div className="relative z-10 mt-4 hidden items-center justify-between gap-3 border-t border-stone-100 pt-3 sm:flex">
          <a
            href={`tel:+1${listing.phone}`}
            data-track="dir-listing-call"
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-[15px] font-semibold tabular-nums text-[#0A0A0A] hover:text-[#77591B] ${dirFocus}`}
          >
            <Phone aria-hidden="true" className="h-4 w-4 text-[#A4823A]" />
            {formatPhone(listing.phone)}
          </a>
          {quotes ? (
            <Link
              href={`${href}#request`}
              data-track="dir-card-quote"
              className={`ml-auto inline-flex min-h-10 items-center rounded-lg px-1 text-sm font-medium text-stone-600 hover:text-stone-900 ${dirFocus}`}
            >
              Request a quote<span className="sr-only">: {listing.businessName}</span>
            </Link>
          ) : null}
          <Link href={href} className={`inline-flex min-h-10 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-[#77591B] hover:text-[#5c4614] ${dirFocus}`}>
            View listing
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            <span className="sr-only">: {listing.businessName}</span>
          </Link>
        </div>
      </article>
    </li>
  );
}

/** The dark band each directory page opens with, in the look of the in-page tools. */
export function DirectoryBand({ children, compact = false }: { readonly children: React.ReactNode; readonly compact?: boolean }) {
  // compact: the search page, where the band holds a title, a choice and a search row and should stay short.
  const pad = compact ? "px-5 py-6 sm:px-8 sm:py-7" : "px-5 py-8 sm:px-10 sm:py-12";
  return (
    <div className={`relative overflow-hidden rounded-3xl border-t-2 border-[#C2A05A] bg-[#0d0f0c] text-[#f3ebdd] shadow-[0_40px_100px_-60px_rgba(28,25,23,0.75)] ${pad}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "radial-gradient(60rem 22rem at 85% -10%, rgba(194,160,90,0.22), transparent 60%), radial-gradient(40rem 20rem at -10% 120%, rgba(164,130,58,0.14), transparent 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export type Crumb = { readonly label: string; readonly href?: string };

/** A breadcrumb trail. The last item is the page itself and is not a link. */
export function DirectoryBreadcrumbs({ trail, tone = "light" }: { readonly trail: readonly Crumb[]; readonly tone?: "light" | "dark" }) {
  const base = tone === "dark" ? "text-[#a99f8f]" : "text-stone-500";
  const hover = tone === "dark" ? "hover:text-[#f3ebdd]" : "hover:text-[#77591B]";
  return (
    <nav aria-label="Breadcrumb" className={`text-xs ${base}`}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {crumb.href && !last ? (
                <Link href={crumb.href} className={`inline-flex min-h-8 items-center rounded-sm ${hover} ${dirFocus}`}>
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="inline-flex min-h-8 items-center">
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** schema.org BreadcrumbList for the same trail, with absolute addresses. */
export function breadcrumbJsonLd(origin: string, trail: readonly Crumb[], selfPath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: `${origin}${crumb.href ?? selfPath}`,
    })),
  };
}

/** schema.org ItemList of the businesses on a page: their names and addresses only. */
export function itemListJsonLd(origin: string, name: string, listings: readonly DirectoryPublicListing[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: listings.length,
    itemListElement: listings.map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${origin}${directoryListingPath(listing.slug)}`,
      name: listing.businessName,
    })),
  };
}
