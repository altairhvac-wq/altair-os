import { serializeJsonLd } from "@/shared/lib/site/structured-data";

/**
 * One JSON-LD block. A native `<script>`, not `next/script`: this is data for
 * crawlers, not code to execute (installed Next docs, guides/json-ld). The
 * payload is serialised and escaped by `serializeJsonLd`; this component
 * never receives a string, so raw text cannot reach `dangerouslySetInnerHTML`.
 */
export function JsonLdScript({
  data,
}: {
  readonly data: Record<string, unknown>;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
