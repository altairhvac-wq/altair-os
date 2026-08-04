/**
 * Work hub — jobs list + detail at `/work`.
 * Legacy `/jobs` and `/jobs/[jobId]` redirect here.
 */

export function flattenSearchParamRecord(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }

  return out;
}

/** Canonical Work hub list href (optional query params preserved). */
export function buildWorkHubHref(
  params?: Record<string, string | undefined | null>,
): string {
  const search = new URLSearchParams();

  if (params) {
    for (const [key, raw] of Object.entries(params)) {
      if (raw == null || raw === "") {
        continue;
      }

      search.set(key, raw);
    }
  }

  const query = search.toString();
  return query ? `/work?${query}` : "/work";
}

/** Canonical Work hub job detail href. */
export function buildWorkJobHref(jobId: string): string {
  return `/work/${jobId}`;
}

/** Legacy `/jobs` → Work hub (preserves query params). */
export function buildWorkHubHrefFromJobsParams(params: {
  [key: string]: string | undefined;
}): string {
  return buildWorkHubHref(params);
}

/** Legacy `/jobs/[jobId]` → Work hub detail (preserves query params). */
export function buildWorkJobHrefFromJobsParams(
  jobId: string,
  params?: { [key: string]: string | undefined },
): string {
  const base = buildWorkJobHref(jobId);

  if (!params) {
    return base;
  }

  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw == null || raw === "") {
      continue;
    }
    search.set(key, raw);
  }

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}
