import type { Metadata } from "next";
import { AltairFeatureNote } from "@/shared/components/resources/AltairFeatureNote";
import {
  ResourceCard,
  ResourcePageShell,
} from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  RESOURCES_TEMPLATES_PATH,
  templateDownloadPath,
} from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { RESOURCE_TEMPLATES } from "@/shared/lib/resources/templates";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Free templates for contractors";
const DESCRIPTION =
  "Download free, original templates for HVAC and trade businesses: an estimate template, a maintenance agreement outline, a pricing worksheet and a daily operations checklist. No account required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_TEMPLATES_PATH,
    title: TITLE,
    description: DESCRIPTION,
  }),
};

const FORMAT_LABEL = { csv: "CSV spreadsheet", md: "Markdown text" } as const;

export default function ResourceTemplatesPage() {
  return (
    <ResourcePageShell
      eyebrow="Templates"
      title={TITLE}
      crumbs={[{ label: "Templates" }]}
      intro={
        <p>
          Plain files you can open in any spreadsheet program or text editor and make your own.
          CSV files open in Excel, Google Sheets or Numbers; Markdown files open in any text
          editor and paste cleanly into a document.
        </p>
      }
    >
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: TITLE,
          description: DESCRIPTION,
          path: RESOURCES_TEMPLATES_PATH,
          parts: RESOURCE_TEMPLATES.map((template) => ({
            name: template.title,
            path: templateDownloadPath(template.id),
          })),
        })}
      />

      <ul className="mt-10 space-y-5">
        {RESOURCE_TEMPLATES.map((template) => (
          <li key={template.id} id={template.id} className="scroll-mt-28">
            <ResourceCard>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                    {template.title}
                  </h2>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
                    {FORMAT_LABEL[template.format]} · {template.filename}
                  </p>
                </div>
                {/* A plain anchor, not next/link: this is a file download
                    from a Route Handler, not a page navigation. */}
                <a
                  href={templateDownloadPath(template.id)}
                  download={template.filename}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#a4823a] px-4 py-2.5 text-sm font-semibold text-[#080907] transition-colors hover:bg-[#c2a05a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/50"
                >
                  Download
                </a>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-700">{template.description}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                <span className="font-semibold text-stone-800">How to use it: </span>
                {template.howToUse}
              </p>
              <AltairFeatureNote featureKey={template.featureKey} compact />
            </ResourceCard>
          </li>
        ))}
      </ul>

      <p
        role="note"
        className="mt-8 rounded-xl border border-stone-300/70 bg-stone-100/70 px-5 py-4 text-sm leading-relaxed text-stone-700"
      >
        <strong className="font-semibold text-stone-900">Note. </strong>
        These templates are general starting points, not legal, tax or financial advice. Example
        prices are placeholders. Agreements and customer-facing terms should be reviewed by an
        attorney licensed in your state before you use them.
      </p>
    </ResourcePageShell>
  );
}
