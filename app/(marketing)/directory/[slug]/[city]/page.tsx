import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryHubPage, hubMetadata, resolveHub, type HubPlace } from "@/shared/components/directory/DirectoryHub";
import { isPlaceSlug, stateFromSegment } from "@/shared/types/directory";

/**
 * A city page: /directory/<state>/<city>, for example /directory/ut/provo.
 *
 * The first segment is the `[slug]` of /directory/[slug] (the business pages
 * and the state pages share it); here it must be a two-letter state. A
 * business's own page is always one segment deep, so nothing at this depth
 * can be a business. See shared/components/directory/DirectoryHub.tsx.
 */

type PageProps = { params: Promise<{ slug: string; city: string }> };

function placeFrom(params: { slug: string; city: string }): HubPlace | null {
  const state = stateFromSegment(params.slug);
  if (!state || !isPlaceSlug(params.city)) return null;
  return { state, citySlug: params.city, trade: null };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const place = placeFrom(await params);
  if (!place) notFound();
  return hubMetadata(place);
}

export default async function DirectoryCityPage({ params }: PageProps) {
  const place = placeFrom(await params);
  if (!place || !(await resolveHub(place))) notFound();
  return <DirectoryHubPage place={place} />;
}
