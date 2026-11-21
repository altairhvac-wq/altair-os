import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Clock3 } from "lucide-react";
import { listPublishedSitePages } from "@/lib/database/queries/marketing-site-pages";
import { ResourceChrome, ResourceMain, ResourcePageHeader } from "@/shared/components/resources/ResourcePageShell";
import { PathMeter, StepBadge, StepDoneToggle } from "@/shared/components/resources/LearningPathProgress";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { RESOURCES_GUIDES_PATH } from "@/shared/lib/resources/catalog";
import { LEARNING_PATH, LEARNING_PATH_STAGES, type PathLink, type PathStep } from "@/shared/lib/resources/learning-path";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { hubTool } from "@/shared/lib/resources/tool-hub";
import { readingMinutes } from "@/shared/lib/site/article-markdown";
import { ARTICLE_TOOL_NAMES, articlePlanFor } from "@/shared/lib/site/article-template";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { PUBLIC_SITE_ORIGIN, buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { SITE_PAGE_PATH_PREFIX } from "@/shared/types/site-page";

/**
 * /resources/guides: the learning path for a new HVAC owner.
 *
 * ============ NOT A SECOND INSIGHTS INDEX ============
 * Until batch 4 this page listed exactly the articles /insights lists (site
 * audit 2026-11-20: "Google sees two thin pages instead of one strong one").
 * It is now an ordered sequence of guides AND tools (shared/lib/resources/
 * learning-path.ts), with its own title, description and self canonical.
 * The owner has not decided whether it should instead redirect to /insights,
 * so the address is kept and nothing redirects.
 *
 * Guide steps read the published rows through the anon-key query, so
 * migration 187's RLS policy still decides which articles can appear; a step
 * whose article is not published falls back to its tool, or is left out.
 */

const TITLE = "Learning Path for New HVAC Owners";
const DESCRIPTION =
  "The guides and free tools a new HVAC owner needs, in order: labor rate, service call price, agreements, break-even, job profit, invoicing, first hire.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: RESOURCES_GUIDES_PATH, title: TITLE, description: DESCRIPTION }),
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2";

type ResolvedLink = { readonly href: string; readonly title: string; readonly kind: "guide" | "tool"; readonly meta: string; readonly track: string };

export default async function LearningPathPage() {
  const pages = await listPublishedSitePages();
  const bySlug = new Map(pages.map((page) => [page.slug, page]));

  const resolve = (link: PathLink | undefined): ResolvedLink | null => {
    if (!link) return null;
    if (link.kind === "tool") {
      const tool = hubTool(link.hubId);
      return { href: link.href, title: link.title, kind: "tool", meta: `Free tool · about ${tool.minutes} min`, track: `next-tool-${link.hubId}-path` };
    }
    const page = bySlug.get(link.slug);
    if (!page) return null;
    const plan = articlePlanFor(link.slug);
    const built = plan.tool ? ` · ${ARTICLE_TOOL_NAMES[plan.tool.id].toLowerCase()} inside` : "";
    return {
      href: `${SITE_PAGE_PATH_PREFIX}/${link.slug}`,
      title: page.title,
      kind: "guide",
      meta: `Guide · ${readingMinutes(page.bodyMarkdown)} min read${built}`,
      track: `next-guide-${link.slug}-path`,
    };
  };

  const steps = LEARNING_PATH.flatMap((step: PathStep) => {
    const primary = resolve(step.primary);
    const secondary = resolve(step.secondary);
    const main = primary ?? secondary;
    if (!main) return [];
    return [{ step, main, extra: primary ? secondary : null }];
  });
  const ids = steps.map(({ step }) => step.id);

  return (
    <ResourceChrome>
      <JsonLdScript
        data={{
          ...buildResourceCollectionStructuredData({
            name: TITLE,
            description: DESCRIPTION,
            path: RESOURCES_GUIDES_PATH,
            parts: steps.map(({ main }) => ({ name: main.title, path: main.href })),
          }),
          mainEntity: {
            "@type": "ItemList",
            name: TITLE,
            itemListOrder: "https://schema.org/ItemListOrderAscending",
            numberOfItems: steps.length,
            itemListElement: steps.map(({ step, main }, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: step.title,
              url: `${PUBLIC_SITE_ORIGIN}${main.href}`,
            })),
          },
        }}
      />
      <ResourceMain width="wide">
        <ResourcePageHeader
          eyebrow="Learning path"
          title="New HVAC owner? Start here."
          crumbs={[{ label: "Learning path" }]}
          intro={
            <p>
              {steps.length} steps, in the order you will need them: the basics, then pricing, then the month, then getting paid, then
              your first hire. Each step is a guide or a free tool, and every guide here has a tool built in. Every article, by topic, is on{" "}
              <Link href={SITE_PAGE_PATH_PREFIX} className="rounded-sm font-medium text-[#77591B] underline-offset-4 hover:underline">
                Insights
              </Link>
              .
            </p>
          }
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <ol className="relative min-w-0 space-y-4">
            <span aria-hidden="true" className="absolute bottom-8 left-5 top-8 w-px bg-stone-300" />
            {steps.map(({ step, main, extra }, index) => {
              const firstOfStage = index === 0 || steps[index - 1].step.stage !== step.stage;
              const Icon = main.kind === "guide" ? BookOpen : Calculator;
              return (
                <li key={step.id} id={`step-${step.id}`} className="relative scroll-mt-24">
                  {firstOfStage ? (
                    <p className="mb-3 ml-14 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">{step.stage}</p>
                  ) : null}
                  <div className="flex gap-4">
                    <StepBadge id={step.id} n={index + 1} />
                    <div className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                      <h2 className="text-[1.15rem] font-semibold leading-snug tracking-tight text-[#0A0A0A]">{step.title}</h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.outcome}</p>
                      <Link
                        href={main.href}
                        data-track={main.track.slice(0, 64)}
                        className={`group mt-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 transition-colors hover:border-[#c2a05a] hover:bg-white ${focusRing}`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-[#e8d9ac]">
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px] font-semibold leading-snug text-[#0A0A0A] group-hover:text-[#77591B]">{main.title}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                            {main.meta}
                          </span>
                        </span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#A4823A]" />
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        {extra ? (
                          <Link
                            href={extra.href}
                            data-track={extra.track.slice(0, 64)}
                            className={`inline-flex items-center gap-1 rounded-sm text-[13px] font-semibold text-[#77591B] hover:underline ${focusRing}`}
                          >
                            Also: {extra.title} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span />
                        )}
                        <StepDoneToggle id={step.id} title={step.title} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <aside className="order-first lg:order-none">
            <div className="rounded-2xl bg-[#0d0f0c] p-5 text-[#f3ebdd] shadow-[0_30px_80px_-45px_rgba(0,0,0,0.75)] lg:sticky lg:top-24">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">Your progress</p>
              <div className="mt-3">
                <PathMeter ids={ids} />
              </div>
              <ol className="mt-5 space-y-1 border-t border-[rgba(230,227,220,0.1)] pt-4 text-[13px]">
                {LEARNING_PATH_STAGES.map((stage) => {
                  const first = steps.findIndex(({ step }) => step.stage === stage);
                  if (first === -1) return null;
                  const count = steps.filter(({ step }) => step.stage === stage).length;
                  return (
                    <li key={stage}>
                      <a
                        href={`#step-${steps[first].step.id}`}
                        className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[#c9bfae] hover:bg-[rgba(230,227,220,0.06)] hover:text-[#fff9ea] ${focusRing} focus-visible:ring-offset-[#0d0f0c]`}
                      >
                        <span>{stage}</span>
                        <span className="text-xs tabular-nums text-[#8e826f]">
                          {count} {count === 1 ? "step" : "steps"}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>
        </div>

        <NextStep
          className="mt-14"
          placement="learning-path"
          steps={NEXT_STEPS.insights}
          heading="When the numbers are done"
          intro="Every free tool in one place, the one-job video, and the software the path keeps pointing at."
        />
      </ResourceMain>
    </ResourceChrome>
  );
}
