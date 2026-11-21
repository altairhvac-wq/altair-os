import { BreakEvenTool } from "@/shared/components/resources/calc/BreakEvenTool";
import { JobProfitabilityTool } from "@/shared/components/resources/calc/JobProfitabilityTool";
import { LaborRateTool } from "@/shared/components/resources/calc/LaborRateTool";
import { InvoiceChecklistTool } from "@/shared/components/site/article/InvoiceChecklistTool";
import { InvoiceLagTool } from "@/shared/components/site/article/InvoiceLagTool";
import { ServiceCallFeeTool } from "@/shared/components/site/article/ServiceCallFeeTool";
import { ARTICLE_TOOL_ANCHOR, ARTICLE_TOOL_NAMES, type ArticleToolId } from "@/shared/lib/site/article-template";

/**
 * The tool built into the middle of an article (chosen per slug in
 * shared/lib/site/article-template.ts). The three calculators are the batch 2
 * tools in their compact mode, with the same "tool used" tracking and a link
 * to the full tool carrying the numbers; the other three are small tools made
 * from the article's own steps.
 *
 * Server component; the tool itself is a client component.
 */

const INTRO: Record<ArticleToolId, string> = {
  "break-even": "The steps above, as a calculator. Put in your own month and watch the number move.",
  "job-profitability": "The two examples above, as a calculator. Run a job you finished last month.",
  "labor-rate": "The \"true hourly cost\" this guide tells you to work out before you set another price.",
  "service-call": "Steps 1 to 3, with your numbers: the fee at your rate, the cost floor, and where your fee sits.",
  "invoice-checklist": "The checklist from this article. Tick it against the invoice you send today.",
  "invoice-lag": "The five-job exercise from this article, with the median worked out for you.",
};

function ToolView({ id }: { readonly id: ArticleToolId }) {
  switch (id) {
    case "break-even":
      return <BreakEvenTool compact />;
    case "job-profitability":
      return <JobProfitabilityTool compact />;
    case "labor-rate":
      return <LaborRateTool compact />;
    case "service-call":
      return <ServiceCallFeeTool />;
    case "invoice-checklist":
      return <InvoiceChecklistTool />;
    case "invoice-lag":
      return <InvoiceLagTool />;
  }
}

export function ArticleTool({ id }: { readonly id: ArticleToolId }) {
  return (
    <section id={ARTICLE_TOOL_ANCHOR} aria-labelledby={`${ARTICLE_TOOL_ANCHOR}-title`} data-article-tool="" className="my-12 scroll-mt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">Built into this guide</p>
      <h2 id={`${ARTICLE_TOOL_ANCHOR}-title`} className="mt-1.5 text-[1.35rem] font-semibold tracking-tight text-[#0A0A0A]">
        Try it: {ARTICLE_TOOL_NAMES[id].toLowerCase()}
      </h2>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-stone-600">{INTRO[id]}</p>
      <div className="mt-5">
        <ToolView id={id} />
      </div>
    </section>
  );
}
