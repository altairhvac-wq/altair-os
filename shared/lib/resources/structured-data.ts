import {
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_ORIGIN,
} from "@/shared/lib/site/public-site";

/**
 * JSON-LD objects for Resource Center pages.
 *
 * Serialised by the shared `JsonLdScript` / `serializeJsonLd`, so the escape
 * for `</script>` is the same one every public page uses. Only facts the page
 * itself shows: name, description, URL, and the links it lists. No ratings,
 * reviews, authors or counts.
 */

type Part = { readonly name: string; readonly path: string };

function absolute(path: string): string {
  return `${PUBLIC_SITE_ORIGIN}${path}`;
}

function isPartOfSite() {
  return { "@type": "WebSite", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN };
}

/** A page that lists other pages (the hub and the section indexes). */
export function buildResourceCollectionStructuredData(input: {
  name: string;
  description: string;
  path: string;
  parts: readonly Part[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absolute(input.path),
    isPartOf: isPartOfSite(),
    publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
    isAccessibleForFree: true,
    hasPart: input.parts.map((part) => ({
      "@type": "WebPage",
      name: part.name,
      url: absolute(part.path),
    })),
  };
}

/** A single tool page (each calculator). */
export function buildResourceWebPageStructuredData(input: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: absolute(input.path),
    isPartOf: isPartOfSite(),
    publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
    isAccessibleForFree: true,
  };
}
