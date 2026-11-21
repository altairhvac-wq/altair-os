import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryHubPage, hubMetadata, resolveHub, type HubPlace } from "@/shared/components/directory/DirectoryHub";
import { isPlaceSlug, stateFromSegment, tradeFromSlug } from "@/shared/types/directory";

/**
 * One trade in one city: /directory/<state>/<city>/<trade>, for example
 * /directory/ut/salt-lake-city/hvac. The trade segment is a trade's own slug
 * (`tradeSlug`); anything else is a 404. See
 * shared/components/directory/DirectoryHub.tsx.
 */

type PageProps = { params: Promise<{ slug: string; city: string; trade: string }> };

function placeFrom(params: { slug: string; city: string; trade: string }): HubPlace | null {
  const state = stateFromSegment(params.slug);
  const trade = tradeFromSlug(params.trade);
  if (!state || !trade || !isPlaceSlug(params.city)) return null;
  return { state, citySlug: params.city, trade };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const place = placeFrom(await params);
  if (!place) notFound();
  return hubMetadata(place);
}

export default async function DirectoryCityTradePage({ params }: PageProps) {
  const place = placeFrom(await params);
  if (!place || !(await resolveHub(place))) notFound();
  return <DirectoryHubPage place={place} />;
}
