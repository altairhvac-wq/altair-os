import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceBuilder } from "@/shared/components/resources/invoice/InvoiceBuilder";
import { computeInvoice } from "@/shared/components/resources/invoice/InvoicePaper";
import { SAMPLE_ESTIMATE } from "@/shared/components/resources/invoice/doc-words";
import {
  BulletList,
  DataTable,
  FaqList,
  GuideLayout,
  GuideSection,
  StepList,
  ToolHero,
  ToolPageShell,
  ToolStage,
  type FaqItem,
} from "@/shared/components/resources/tools/ToolGuide";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { RESOURCES_ESTIMATE_PATH, RESOURCES_FLAT_RATE_PATH, RESOURCES_PATH, RESOURCES_TEMPLATES_PATH } from "@/shared/lib/resources/catalog";
import { formatCents, formatQty, parseCents } from "@/shared/lib/resources/invoice-builder";
import { INVOICE_BUILDER_PATH } from "@/shared/lib/resources/tool-hub";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { buildPublicSocialMetadata, PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";

/**
 * /resources/estimate-builder: the HVAC Estimate Builder.
 *
 * The Invoice Builder with an estimate's words (`doc="estimate"`): the same
 * form, lines and whole-cent totals, so an estimate and the invoice that
 * follows add up the same way. The example below is computed by the
 * builder's own math from the builder's own sample. Nothing typed into the
 * builder leaves the browser.
 */

const TITLE = "HVAC Estimate Template: Free Builder, Example and PDF";
const H1 = "HVAC estimate template and builder";
const DESCRIPTION =
  "Free HVAC estimate template and builder: scope of work, equipment, labor and parts, tax, a deposit and a valid-until date. Print it or save it as a PDF.";
const MODIFIED = "2026-11-27T00:00:00.000Z";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: RESOURCES_ESTIMATE_PATH, title: TITLE, description: DESCRIPTION }),
};

const SAMPLE = computeInvoice(SAMPLE_ESTIMATE, "estimate");
const T = SAMPLE.totals;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

const FAQ: readonly FaqItem[] = [
  {
    question: "What should an HVAC estimate include?",
    answer:
      "Your company and license number where required, the customer and the service address, the equipment, the scope of work in plain words, each charge on its own line, tax, the total, how long the price holds, any deposit, the warranty, and a place for the customer to accept.",
  },
  {
    question: "What is the difference between an estimate and an invoice?",
    answer:
      "An estimate is a price for work that has not been done; nothing is owed until the customer approves it. An invoice is the bill for work that has been done. A good estimate turns into the invoice with the same lines and the same total.",
  },
  {
    question: "Is an estimate the same as a quote?",
    answer:
      "People use the two words differently. Many shops call a firm price a quote and a best guess an estimate. Whichever word you use, write on the page whether the price is fixed and what would change it, so the customer is not surprised later.",
  },
  {
    question: "How long should an HVAC estimate be valid?",
    answer:
      "Long enough for the customer to decide, short enough that your costs have not moved. Put a date on it. The builder offers 15, 30 and 60 days; use whatever your suppliers' prices allow.",
  },
  {
    question: "Should I ask for a deposit?",
    answer:
      "On installs and larger jobs it is common to ask for part of the total before ordering equipment. Say the amount and when the rest is due on the estimate itself. Check your state's rules: some limit the deposit a contractor may take.",
  },
  {
    question: "Can I use a free HVAC estimate template?",
    answer:
      "Yes. The builder on this page needs no sign-up: fill it in and print or save a PDF, print a blank copy to fill in by hand, or copy the blank template into a word processor. Editable Excel and PDF versions are on the templates page.",
  },
];

const NAV = [
  { id: "template", label: "The template, part by part" },
  { id: "example", label: "Filled-in example" },
  { id: "how-to", label: "How to write one" },
  { id: "approved", label: "Getting it approved" },
  { id: "faq", label: "Questions owners ask" },
];

export default function EstimateBuilderPage() {
  const url = `${PUBLIC_SITE_ORIGIN}${RESOURCES_ESTIMATE_PATH}`;
  return (
    <ToolPageShell>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: H1,
              description: DESCRIPTION,
              url,
              dateModified: MODIFIED,
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
            },
            {
              "@type": "WebApplication",
              name: "HVAC Estimate Builder",
              url: `${url}#estimate-builder`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (runs in the browser)",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Free tools", item: `${PUBLIC_SITE_ORIGIN}${RESOURCES_PATH}` },
                { "@type": "ListItem", position: 2, name: "HVAC estimate template", item: url },
              ],
            },
          ],
        }}
      />
      <JsonLdScript data={buildFaqPageStructuredData(FAQ)} />

      <ToolHero
        crumb="HVAC estimate template"
        eyebrow="Free tool · Estimate Builder"
        title={H1}
        question="A complete HVAC estimate, built as you type. Print it or save it as a PDF."
        needs="The job you are pricing: the customer, the work you propose, the hours and the parts."
        lead={
          <p>
            Fill in the job on the left and watch a professional HVAC estimate build itself on the right: the scope of
            work, the equipment, labor and parts, tax, a deposit if you take one, and the date the price is good
            until. Print it, save it as a PDF, or print a blank copy for the truck.
          </p>
        }
        updated={{ iso: MODIFIED, label: "November 27, 2026" }}
        facts={["No sign-up, no email", "Customer details stay on your device", "Print or save as PDF"]}
        jumpLinks={[
          { href: "#estimate-builder", label: "Open the builder" },
          { href: "#template", label: "Template parts" },
          { href: "#example", label: "Example" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      <ToolStage>
        <InvoiceBuilder doc="estimate" />
        <p className="mx-auto mt-3 max-w-4xl px-2 text-center text-xs leading-relaxed text-stone-500 print:hidden">
          Totals are worked in whole cents, rounded once per line and once for tax. Tax rules differ by state: check
          which of your lines are taxable. This page stores nothing you type unless you turn on &ldquo;Remember my
          company details&rdquo;.
        </p>
        <NextStep
          className="mx-auto mt-10 max-w-6xl print:hidden"
          placement="estimate-builder"
          steps={NEXT_STEPS.estimateBuilder}
          heading="Estimate done? Here is what comes next."
        />
      </ToolStage>

      <GuideLayout eyebrow="The guide" title="How to write an HVAC estimate customers say yes to" nav={NAV}>
        <GuideSection id="template" n={1} title="The HVAC estimate template, part by part">
          <p>
            An estimate has one job: let the customer say yes without calling you back with questions. These are the
            parts, in order, and what each one is for.
          </p>
          <DataTable
            head={["Part", "What goes in it", "Why it matters"]}
            rows={[
              ["Header", "Company name, address, phone, email, license number; ESTIMATE with a number, the date and a valid-until date", "The valid-until date protects you when part prices move. Some states require the license number on a contractor's paperwork."],
              ["Customer", "Name, address, phone, email; the service address if different", "Rentals and businesses often have a different billing and service address. Put both."],
              ["Equipment", "Make, model, serial and location of what is there now", "Shows you looked at their system, and saves a trip when the parts are ordered."],
              ["Scope of work", "What they asked for, what you found, what you propose", "The part customers read. Three short lines in plain words do more than a page of part numbers."],
              ["Line items", "Labor (hours × rate), each part, equipment, permit and disposal fees; taxable or not", "A price the customer can follow. On flat-rate work, one line per task is enough."],
              ["Totals", "Subtotal, discount, tax, total, and the deposit to start if you take one", "Make the total the easiest number on the page to find."],
              ["Approval and terms", "How to approve, how long the price holds, warranty, permit, a signature line", "Tell the customer exactly how to say yes. The fewer steps, the faster the answer."],
            ]}
          />
          <p>
            The labor and part prices should come from your own costs. The{" "}
            <Link href={RESOURCES_FLAT_RATE_PATH} className={link}>
              flat-rate price list builder
            </Link>{" "}
            prices each task once, so every estimate you write uses the same numbers.
          </p>
        </GuideSection>

        <GuideSection id="example" n={2} title="HVAC estimate example: a filled-in repair">
          <p>
            A typical repair estimate: the upstairs is not cooling, the condenser fan motor is failing and the
            capacitor is weak. Press <strong>Load sample</strong> in the builder to open this exact estimate. Every
            name, address and price is made up.
          </p>
          <DataTable
            caption="Estimate lines, sample data"
            head={["Line", "Qty × rate", "Taxable", "Amount"]}
            rows={[
              ...SAMPLE_ESTIMATE.lines.map((line, index) => [
                line.description,
                `${formatQty(line.qty)} × ${formatCents(parseCents(line.price))}`,
                line.taxable ? "Yes" : "No",
                formatCents(T.lineCents[index] ?? 0),
              ]),
              ["Subtotal", "", "", formatCents(T.subtotalCents)],
              [`Sales tax, ${SAMPLE_ESTIMATE.taxRate}% on taxable lines (${formatCents(T.taxBaseCents)})`, "", "", formatCents(T.taxCents)],
              ["Estimate total", "", "", formatCents(T.totalCents)],
            ]}
          />
          <p>
            Check the arithmetic on any example before you copy it. The parts are taxed and the labor is not in this
            sample; your state may treat them differently.
          </p>
        </GuideSection>

        <GuideSection id="how-to" n={3} title="How to write an HVAC estimate, step by step">
          <StepList
            steps={[
              { title: "Number it and date it", text: "Give every estimate a number and the date, and a date the price is good until." },
              { title: "Identify both parties", text: "Your company, address, phone and license number where your state requires it; the customer's name, address and the service address." },
              { title: "Record the equipment", text: "Make, model, serial and where it is, read from the data plate." },
              { title: "Write the scope", text: "What they asked for, what you found, and what you propose, in words the customer would use." },
              { title: "Itemize the price", text: "Labor, each part, any equipment, permit and disposal fees, each on its own line and marked taxable or not." },
              { title: "Total it", text: "Subtotal, discount, tax, total, and the deposit to start if you take one." },
              { title: "Say how to approve", text: "One sentence: reply to the email, sign and return it, or call. Add the warranty and what is not included." },
            ]}
          />
        </GuideSection>

        <GuideSection id="approved" n={4} title="Getting the estimate approved">
          <BulletList
            items={[
              "Send it while you are still on site, or the same day. An estimate that arrives three days later is competing with two others.",
              "Say what is not included. A line such as \"anything else found once the unit is open is quoted before it is done\" prevents the hardest conversation.",
              "Make yes easy. A reply to an email or a signature on a phone is faster than printing, signing and scanning.",
              "Follow up once, a few days later. Many estimates are not turned down; they are forgotten.",
            ]}
          />
          <p>
            When the work is approved and done, the same lines become the invoice. The{" "}
            <Link href={INVOICE_BUILDER_PATH} className={link}>
              invoice builder
            </Link>{" "}
            uses the same form, and editable Excel and PDF estimate files are on the{" "}
            <Link href={RESOURCES_TEMPLATES_PATH} className={link}>
              templates page
            </Link>
            .
          </p>
        </GuideSection>

        <GuideSection id="faq" n={5} title="Questions owners ask">
          <FaqList items={FAQ} />
        </GuideSection>
      </GuideLayout>
    </ToolPageShell>
  );
}
