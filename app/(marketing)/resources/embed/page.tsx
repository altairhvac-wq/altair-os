import type { Metadata } from "next";
import Link from "next/link";
import { EmbedSnippet } from "@/shared/components/resources/embed/EmbedSnippet";
import { ResourcePageShell, resourceLinkClass } from "@/shared/components/resources/ResourcePageShell";
import { FaqList, type FaqItem } from "@/shared/components/resources/tools/ToolGuide";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { RESOURCES_EMBED_PATH, RESOURCES_PATH } from "@/shared/lib/resources/catalog";
import { EMBED_TOOLS, embedPath, embedSnippet } from "@/shared/lib/resources/embeds";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { buildPublicSocialMetadata, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";

/**
 * /resources/embed: the code to put one of the free calculators on another
 * website. Each calculator is shown here exactly as it will appear there
 * (the same /embed/<id> page, in a frame), with the code to copy under it.
 */

const TITLE = "Put an HVAC Calculator on Your Website";
const DESCRIPTION =
  "Add a free HVAC labor rate, break-even or job profit calculator to your own website. Copy one line of code. No account, and nothing your visitors type leaves their browser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: RESOURCES_EMBED_PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQ: readonly FaqItem[] = [
  {
    question: "Does it cost anything?",
    answer: "No. The calculators are free to use on this site and free to put on yours. There is no account to create and no key to request.",
  },
  {
    question: "What do I have to keep?",
    answer: "The line under the calculator that names it and links back to the full version here. That link is the only thing we ask for.",
  },
  {
    question: "Do you track my visitors?",
    answer: "No. A calculator shown on your website does not count visits or record what is pressed, and it sets no cookies. The numbers your visitors type stay in their own browser.",
  },
  {
    question: "Can I change the size?",
    answer: "Yes. The calculator fills the width of the space you give it, up to 640 pixels. The height in the code fits that width. On a narrow phone the calculator is taller, so it scrolls inside its frame; raise the height number in the code if you would rather it did not.",
  },
  {
    question: "Will it work on my website builder?",
    answer: "It works anywhere you can paste HTML: WordPress (a Custom HTML block), Squarespace (a Code block), Wix (Embed HTML) and hand-built sites. If your builder strips frames, it will show only the link.",
  },
];

export default function EmbedCalculatorsPage() {
  return (
    <ResourcePageShell
      eyebrow="For other websites"
      title={TITLE}
      crumbs={[{ label: "Put a calculator on your website" }]}
      intro={
        <p>
          Run a supply house, a trade school, a blog or a bookkeeping practice for contractors? You can put one of these
          calculators on your own page. Copy the code under the one you want and paste it where it should appear. Your
          visitors use it without leaving your site.
        </p>
      }
    >
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: TITLE,
          description: DESCRIPTION,
          path: RESOURCES_EMBED_PATH,
          parts: EMBED_TOOLS.map((tool) => ({ name: tool.title, path: tool.fullPath })),
        })}
      />
      <JsonLdScript data={buildFaqPageStructuredData(FAQ)} />

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ["Pick a calculator", "Three are ready: labor rate, break-even and job profit."],
          ["Copy the code", "One frame and one link. Nothing to install."],
          ["Paste it on your page", "Anywhere your site accepts HTML."],
        ].map(([title, text], index) => (
          <li key={title} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d0f0c] font-mono text-xs font-semibold text-[#e8d9ac]">{index + 1}</span>
            <span>
              <span className="block text-sm font-semibold text-stone-900">{title}</span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-stone-600">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      {EMBED_TOOLS.map((tool) => (
        <section key={tool.id} aria-labelledby={`embed-${tool.id}`} className="mt-12">
          <h2 id={`embed-${tool.id}`} className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
            {tool.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {tool.text}{" "}
            <Link href={tool.fullPath} className={resourceLinkClass}>
              See the full version
            </Link>
            .
          </p>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">How it will look on your page</p>
          <div className="mt-2 rounded-2xl border border-dashed border-stone-300 bg-stone-100/60 p-2 sm:p-4">
            <iframe src={embedPath(tool.id)} title={`${tool.title} (preview)`} width="100%" height={tool.height} loading="lazy" className="mx-auto block max-w-[640px] border-0" />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">The code</p>
          <div className="mt-2">
            <EmbedSnippet code={embedSnippet(tool, PUBLIC_SITE_ORIGIN)} name={tool.title} />
          </div>
        </section>
      ))}

      <section aria-labelledby="embed-faq" className="mt-14">
        <h2 id="embed-faq" className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
          Questions
        </h2>
        <div className="mt-4">
          <FaqList items={FAQ} />
        </div>
      </section>

      <p className="mt-10 text-sm text-stone-600">
        Looking for the calculators themselves?{" "}
        <Link href={RESOURCES_PATH} className={resourceLinkClass}>
          All the free tools
        </Link>{" "}
        are here, with save, share and print.
      </p>
    </ResourcePageShell>
  );
}
