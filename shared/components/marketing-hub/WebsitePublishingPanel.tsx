import { ExternalLink, Globe } from "lucide-react";
import { StatusPill } from "@/shared/design-system/components";
import {
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components/mc-surface";
import {
  buildSitePublishingPanel,
  type SitePublishingDetails,
} from "@/shared/types/site-publishing-details";

/**
 * Website publishing details for one Marketing post.
 *
 * ====================== READ ONLY, ON PURPOSE ======================
 * This panel reports; it does not publish, edit, retry or unpublish. The
 * publish path is `dispatchPublish` behind the kill switch and a recorded
 * approval, and putting a button here that reached it would be a second
 * door into an irreversible action from a screen whose job is to explain
 * what already happened.
 *
 * It also stores nothing. Every value is projected from
 * `marketing_site_pages`, `marketing_site_page_revisions`, the delivery
 * ledger and the content package's brief — see `site-publishing-details.ts`.
 *
 * ====================== WHY IT IS NOT SHOWN EVERYWHERE ======================
 * Rendered only for `channelTarget === "website"`. A Facebook post has no
 * slug, no canonical and no meta description, and showing empty SEO rows on
 * one would suggest those fields were meant to be filled in.
 */
export function WebsitePublishingPanel({
  details,
}: {
  readonly details: SitePublishingDetails;
}) {
  const panel = buildSitePublishingPanel(details);

  return (
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass} mt-4`}
      data-testid="website-publishing-panel"
      aria-label="Website publishing details"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <Globe
            className="mt-0.5 h-4 w-4 shrink-0 text-altair-brass"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-altair-ink">
              Altair website
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-altair-ink-muted">
              {panel.summary}
            </p>
          </div>
        </div>
        <StatusPill tone={panel.statusTone} size="sm">
          {panel.statusLabel}
        </StatusPill>
      </header>

      {panel.publicUrl ? (
        <div className="mt-3">
          <a
            href={panel.publicUrl}
            target="_blank"
            // `noopener` is what stops the opened page reaching back through
            // `window.opener`. The URL is the canonical this publish
            // recorded, never assembled here from an editable field.
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-altair-brass underline underline-offset-4"
          >
            Open live page
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      ) : null}

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {panel.rows.map((row) => (
          <div
            key={row.label}
            className={row.wrap ? "sm:col-span-2" : undefined}
          >
            <dt className="text-[11px] font-medium uppercase tracking-wide text-altair-ink-muted">
              {row.label}
            </dt>
            <dd
              className={`mt-0.5 text-xs text-altair-ink ${
                row.wrap ? "break-words" : "truncate"
              }`}
            >
              {/* Absent values render as a neutral dash. Never a placeholder
                  that could be mistaken for a real one. */}
              {row.value ?? (
                <span className="text-altair-ink-muted">Not available</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
