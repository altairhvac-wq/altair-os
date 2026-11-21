import { CalendarDays, Clock, Globe, MapPin, Navigation, Phone, Siren } from "lucide-react";
import { ListingMark, Tag } from "@/shared/components/directory/DirectoryUi";
import {
  formatPhone,
  normalizePhone,
  normalizeWebsite,
  serviceLabel,
  stateName,
  summarizeHours,
  websiteLabel,
  type DirectoryHours,
} from "@/shared/types/directory";

/**
 * What the listing will look like, drawn from what has been typed so far.
 * Used beside the form on /directory/list and on the manage page. It is a
 * picture of the page, not the page: nothing in it is a link.
 */

export type PreviewValues = {
  businessName: string;
  tradeType: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  description: string;
  serviceArea: string;
  acceptsSubWork: boolean;
  services: string[];
  hours: DirectoryHours | null;
  emergencyService: string;
  yearFounded: string;
  logoUrl?: string | null;
};

function Placeholder({ children }: { readonly children: React.ReactNode }) {
  return <span className="rounded bg-stone-100 px-1.5 text-stone-400">{children}</span>;
}

export function ListingPreview({ values, compact = false }: { readonly values: PreviewValues; readonly compact?: boolean }) {
  const name = values.businessName.trim();
  const phone = normalizePhone(values.phone);
  const website = values.website.trim() ? normalizeWebsite(values.website) : null;
  const place = values.city.trim() ? `${values.city.trim()}${values.state ? `, ${stateName(values.state)}` : ""}` : "";
  const hours = values.hours ? summarizeHours(values.hours) : [];
  const year = /^\d{4}$/.test(values.yearFounded.trim()) ? values.yearFounded.trim() : null;

  return (
    <div aria-hidden="true" className="pointer-events-none select-none overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_30px_70px_-50px_rgba(28,25,23,0.6)]">
      <div className="h-14 bg-[#0d0f0c]" style={{ backgroundImage: "radial-gradient(24rem 6rem at 80% -20%, rgba(194,160,90,0.3), transparent 60%)" }} />
      <div className="px-4 pb-4">
        <div className="-mt-7 flex items-end gap-3">
          <span className="rounded-xl bg-white p-0.5 shadow-sm">
            <ListingMark name={name || "Your business"} logoUrl={values.logoUrl ?? null} />
          </span>
          <div className="min-w-0 pb-0.5">
            <p className="truncate text-lg font-semibold leading-tight tracking-tight text-[#0A0A0A]">{name || <Placeholder>Your business name</Placeholder>}</p>
          </div>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-600">
          <span className="font-semibold text-[#77591B]">{values.tradeType || <Placeholder>Trade</Placeholder>}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-stone-400" />
            {place || <Placeholder>City, State</Placeholder>}
          </span>
          {year ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-stone-400" />
              Since {year}
            </span>
          ) : null}
        </p>
        {values.emergencyService === "yes" || values.acceptsSubWork ? (
          <p className="mt-2.5 flex flex-wrap gap-1.5">
            {values.emergencyService === "yes" ? (
              <Tag tone="alert">
                <Siren className="h-3 w-3" /> Emergency service
              </Tag>
            ) : null}
            {values.acceptsSubWork ? <Tag tone="brass">Takes subcontract work</Tag> : null}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <span className="col-span-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#A4823A] px-2 text-xs font-semibold tabular-nums text-[#080907]">
            <Phone className="h-3.5 w-3.5" />
            {phone ? `Call ${formatPhone(phone)}` : "Call"}
          </span>
          <span className={`inline-flex min-h-9 items-center justify-center gap-1.5 truncate rounded-lg border px-2 text-xs font-semibold ${website ? "border-stone-300 text-stone-800" : "border-dashed border-stone-200 text-stone-400"}`}>
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{website ? websiteLabel(website) : "Website"}</span>
          </span>
          <span className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-2 text-xs font-semibold text-stone-800">
            <Navigation className="h-3.5 w-3.5" />
            Map
          </span>
        </div>

        {values.description.trim() ? (
          <p className={`mt-3 whitespace-pre-line break-words text-[13px] leading-relaxed text-stone-700 ${compact ? "line-clamp-3" : "line-clamp-6"}`}>
            {values.description.trim()}
          </p>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed text-stone-400">A few sentences about your work appear here.</p>
        )}

        {values.services.length > 0 ? (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {values.services.slice(0, compact ? 4 : 10).map((service) => (
              <Tag key={service}>{serviceLabel(service)}</Tag>
            ))}
            {values.services.length > (compact ? 4 : 10) ? <Tag>+{values.services.length - (compact ? 4 : 10)} more</Tag> : null}
          </p>
        ) : null}

        {hours.length > 0 && !compact ? (
          <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              <Clock className="h-3 w-3" /> Hours
            </p>
            <dl className="mt-1 space-y-0.5 text-xs">
              {hours.map((line) => (
                <div key={line.days} className="flex justify-between gap-3">
                  <dt className="text-stone-500">{line.days}</dt>
                  <dd className={line.time === "Closed" ? "text-stone-400" : "font-medium tabular-nums text-stone-800"}>{line.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {values.serviceArea.trim() && !compact ? (
          <p className="mt-3 text-xs text-stone-500">
            <span className="font-medium text-stone-700">Serves:</span> {values.serviceArea.trim()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
