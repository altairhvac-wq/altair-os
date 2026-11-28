import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { TemplateLibrary } from "@/shared/components/resources/templates/TemplateLibrary";
import { FaqList, ToolHero, ToolPageShell, ToolStage, type FaqItem } from "@/shared/components/resources/tools/ToolGuide";
import { CALCULATORS_UPDATED } from "@/shared/components/resources/CalculatorFrame";
import { RESOURCES_PATH, RESOURCES_TEMPLATES_PATH } from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { INVOICE_BUILDER_PATH } from "@/shared/lib/resources/tool-hub";
import { RESOURCE_TEMPLATES, templateFileName, templateFilePath } from "@/shared/lib/resources/templates";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";

const TITLE = "Free HVAC Business Templates";
const H1 = "Free HVAC templates: PDF, Excel and Word";
const DESCRIPTION =
  "Free HVAC estimate template, pricing worksheet, maintenance agreement outline and daily checklist. Print as PDF or edit in Excel or Word. No email.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: RESOURCES_TEMPLATES_PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQ: readonly FaqItem[] = [
  {
    question: "Do I have to give an email address to download?",
    answer: "No. Every template opens and downloads straight from this page: no form, no sign-up and no account.",
  },
  {
    question: "What programs open these files?",
    answer:
      "The .xlsx files open in Microsoft Excel, Google Sheets (File, then Import) and Apple Numbers. The .docx files open in Microsoft Word, Google Docs and Apple Pages. To get a PDF, use Print / PDF on this page and choose Save as PDF in the print dialog.",
  },
  {
    question: "Do the spreadsheets calculate for me?",
    answer:
      "Yes. In the estimate, line totals, the subtotal, sales tax and the total work themselves out as you type. In the pricing worksheet, every line after your own numbers is a formula, down to the price and the effective labor rate.",
  },
  {
    question: "Can I use the maintenance agreement outline as my contract?",
    answer:
      "No. It is an outline of the sections an agreement usually needs and the decisions in each. Rules on auto-renewal, cancellation and warranties differ by state, so have an attorney licensed in your state write the final agreement from your answers.",
  },
  {
    question: "Are the prices in the examples real?",
    answer:
      "No. The examples use a made-up business, customer and prices to show what a finished template looks like. Use your own costs and rates; the free calculators can help you work them out.",
  },
];

export default function ResourceTemplatesPage() {
  return (
    <ToolPageShell>
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: H1,
          description: DESCRIPTION,
          path: RESOURCES_TEMPLATES_PATH,
          parts: [
            { name: "HVAC invoice template and builder", path: INVOICE_BUILDER_PATH },
            ...RESOURCE_TEMPLATES.flatMap((template) => [
              { name: `${template.title} (${template.editable === "xlsx" ? "Excel" : "Word"})`, path: templateFilePath(templateFileName(template, "blank")) },
              { name: `${template.title}, filled-in example`, path: templateFilePath(templateFileName(template, "example")) },
            ]),
          ],
        })}
      />
      <JsonLdScript data={buildFaqPageStructuredData(FAQ)} />

      <ToolHero
        trail={[{ label: "Free tools", href: RESOURCES_PATH }]}
        crumb="Templates"
        eyebrow="Free templates"
        title={H1}
        lead={
          <p>
            An estimate, a pricing worksheet, a maintenance agreement outline and a daily office checklist. Each one
            prints as a clean PDF, downloads as a file you can edit, and comes with a filled-in HVAC example so you can
            see a finished one first.
          </p>
        }
        updated={CALCULATORS_UPDATED}
        facts={["No email, no sign-up", "PDF, Excel and Word", "Filled-in HVAC examples"]}
        jumpLinks={[
          { href: "#invoice", label: "Invoice builder" },
          { href: "#templates", label: "The templates" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      <ToolStage>
        <section id="invoice" aria-label="HVAC invoice template and builder" className="mb-6 scroll-mt-28 print:hidden">
          <Link
            href={INVOICE_BUILDER_PATH}
            className="group flex flex-col gap-4 rounded-2xl bg-[#0d0f0c] p-6 text-[#f3ebdd] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] transition-colors hover:bg-[#151812] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/60 focus-visible:ring-offset-2 sm:flex-row sm:items-center sm:justify-between sm:p-7"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A4823A]/15 ring-1 ring-inset ring-[#C2A05A]/30">
                <Receipt aria-hidden="true" className="h-5 w-5 text-[#e8d9ac]" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">Start here · invoice template and builder</p>
                <p className="mt-1 text-xl font-semibold text-[#fff9ea]">Build a complete HVAC invoice in your browser</p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#c9bfae]">
                  Equipment, refrigerant, labor and parts lines with tax and deposits worked out, then print it or save it
                  as a PDF. Nothing is uploaded.
                </p>
              </div>
            </div>
            <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[#a4823a] px-5 text-sm font-semibold text-[#080907] transition-colors group-hover:bg-[#c2a05a]">
              Open the Invoice Builder <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </Link>
        </section>

        <div id="templates" className="scroll-mt-28">
          <TemplateLibrary />
        </div>

        <p
          role="note"
          className="mt-6 rounded-xl border border-stone-300/70 bg-stone-100/70 px-5 py-4 text-sm leading-relaxed text-stone-700 print:hidden"
        >
          <strong className="font-semibold text-stone-900">Note. </strong>
          These templates are general starting points, not legal, tax or financial advice. Example businesses and prices
          are made up. Agreements and customer-facing terms should be reviewed by an attorney licensed in your state
          before you use them.
        </p>

        <NextStep className="mx-auto mt-10 max-w-6xl print:hidden" placement="templates" steps={NEXT_STEPS.templates} heading="Templates done? Price the work that goes on them." />

        <section id="faq" aria-labelledby="templates-faq" className="mx-auto mt-12 max-w-4xl scroll-mt-24 print:hidden">
          <h2 id="templates-faq" className="text-[1.5rem] font-semibold tracking-tight text-[#0A0A0A]">
            Questions owners ask
          </h2>
          <div className="mt-4">
            <FaqList items={FAQ} />
          </div>
        </section>
        <div className="h-16 print:hidden" />
      </ToolStage>
    </ToolPageShell>
  );
}
