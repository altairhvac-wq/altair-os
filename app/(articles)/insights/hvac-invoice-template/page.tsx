import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { InvoiceBuilder } from "@/shared/components/resources/invoice/InvoiceBuilder";
import { computeInvoice } from "@/shared/components/resources/invoice/InvoicePaper";
import { SAMPLE_INVOICE } from "@/shared/components/resources/invoice/invoice-state";
import {
  BulletList,
  Callout,
  DataTable,
  FaqList,
  GuideLayout,
  GuideSection,
  ProductBand,
  RelatedGrid,
  StepList,
  ToolHero,
  ToolPageShell,
  ToolStage,
  type FaqItem,
} from "@/shared/components/resources/tools/ToolGuide";
import { formatCents, formatQty, parseCents } from "@/shared/lib/resources/invoice-builder";
import { RESOURCES_TEMPLATES_PATH, calculatorPath } from "@/shared/lib/resources/catalog";
import { CODE_ROUTED_ARTICLES } from "@/shared/lib/site/code-routed-articles";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { buildPublicSocialMetadata, PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";

/**
 * /insights/hvac-invoice-template: the HVAC Invoice Builder.
 *
 * A static route beside `[slug]` (static segments win), so the ranked address
 * is unchanged. The builder is the only client component; the template, the
 * example and the FAQ are server-rendered HTML. The example's totals are
 * computed by the builder's own integer-cent math from the builder's own
 * sample, so the guide and the tool cannot disagree.
 *
 * Nothing typed into the builder leaves the browser (see InvoiceBuilder).
 */

const PATH = "/insights/hvac-invoice-template";
const TITLE = "HVAC Invoice Template: Free Builder, Example and PDF";
/** Shared with the Insights cards, so a card names the page it opens. */
const { title: H1, description: DESCRIPTION } = CODE_ROUTED_ARTICLES["hvac-invoice-template"];
const PUBLISHED = "2026-11-17T23:24:12.977Z";
const MODIFIED = "2026-11-20T00:00:00.000Z";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: PATH, title: TITLE, description: DESCRIPTION }),
};

const SAMPLE = computeInvoice(SAMPLE_INVOICE);
const T = SAMPLE.totals;

const FAQ: readonly FaqItem[] = [
  {
    question: "What is an HVAC invoice?",
    answer:
      "An HVAC invoice is the bill you give a customer after heating, cooling or ventilation work. Besides the usual company, customer, line items and total, it records the equipment worked on, any refrigerant added or recovered, what was found and fixed, the warranty and how to pay.",
  },
  {
    question: "How do I create an invoice for HVAC work?",
    answer:
      "Start from a template with your company details, then add the customer and service address, the equipment make, model and serial, the complaint, cause and correction, each charge on its own line, tax, the total and balance due, your payment terms and the warranty. Send it the same day the job is finished. The builder on this page does each step and prints the result or saves it as a PDF.",
  },
  {
    question: "What should be on an HVAC service invoice?",
    answer:
      "At minimum: invoice number and dates, your company and license number where required, the customer and service address, equipment details, refrigerant type and amount if any was used, the work performed, itemized labor, parts and fees, tax, total, balance due, payment terms, warranty and how to pay.",
  },
  {
    question: "Should I itemize labor and parts on an HVAC invoice?",
    answer:
      "Yes, even on flat-rate work. Customers question what they cannot see, and states often tax parts and labor differently. On a flat-rate job you can show the task price as one line and still list the main parts used beneath it.",
  },
  {
    question: "How do I invoice for an HVAC maintenance agreement?",
    answer:
      "Bill the agreement itself on its own schedule, monthly or yearly, showing the plan name, the period covered and the visits included. Then, at each visit, give the customer a zero-balance invoice or service record showing what was checked, plus any repairs at the member price.",
  },
  {
    question: "How do I bill a deposit on an HVAC installation?",
    answer:
      "Send a deposit invoice for the agreed share of the job total before the work, then a final invoice for the full job that shows the deposit as paid and the balance due. On longer jobs, progress invoices bill agreed shares as the work reaches each stage. The builder has Deposit and Progress modes for both.",
  },
  {
    question: "When should an HVAC invoice be paid?",
    answer:
      "Whenever your terms say, and the terms should be on the invoice. Many residential shops ask for payment when the work is done; commercial customers often expect net 30. Whatever you choose, write the due date on the invoice so the customer does not have to ask.",
  },
  {
    question: "Can I use a free HVAC invoice template?",
    answer:
      "Yes. The builder on this page is free with no sign-up: fill it in and print or save a PDF, print a blank copy to fill in by hand, or copy the blank template into a word processor, a spreadsheet or your accounting software. Nothing you type is sent anywhere.",
  },
];

const NAV = [
  { id: "template", label: "The template, field by field" },
  { id: "example", label: "Filled-in example" },
  { id: "how-to", label: "How to write one" },
  { id: "types", label: "Service, install, maintenance" },
  { id: "deposits", label: "Deposit and progress invoices" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "beyond", label: "When a template is not enough" },
  { id: "faq", label: "Questions owners ask" },
];

export default function InvoiceTemplatePage() {
  const url = `${PUBLIC_SITE_ORIGIN}${PATH}`;
  return (
    <ToolPageShell>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: H1,
              description: DESCRIPTION,
              url,
              mainEntityOfPage: { "@type": "WebPage", "@id": url },
              datePublished: PUBLISHED,
              dateModified: MODIFIED,
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
            },
            {
              "@type": "WebApplication",
              name: "HVAC Invoice Builder",
              url: `${url}#invoice-builder`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (runs in the browser)",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Free tools", item: `${PUBLIC_SITE_ORIGIN}/resources` },
                { "@type": "ListItem", position: 2, name: "HVAC invoice template", item: url },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ],
        }}
      />

      <ToolHero
        crumb="HVAC invoice template"
        eyebrow="Free tool · Invoice Builder"
        title={H1}
        question="A complete HVAC invoice, built as you type. Print it or save it as a PDF."
        needs="The job in front of you: the customer, the hours and the parts used. The equipment data plate if it is service work."
        lead={
          <p>
            Fill in the job on the left and watch a professional HVAC invoice build itself on the right: equipment and
            serial, refrigerant, complaint, cause and correction, labor, parts, tax and the balance due. Print it, save
            it as a PDF, or print a blank copy for the truck.
          </p>
        }
        updated={{ iso: MODIFIED, label: "November 20, 2026" }}
        facts={["No sign-up, no email", "Customer details stay on your device", "Print or save as PDF"]}
        jumpLinks={[
          { href: "#invoice-builder", label: "Open the builder" },
          { href: "#template", label: "Template fields" },
          { href: "#example", label: "Example" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      <ToolStage>
        <InvoiceBuilder />
        <p className="mx-auto mt-3 max-w-4xl px-2 text-center text-xs leading-relaxed text-stone-500 print:hidden">
          Totals are worked in whole cents, rounded once per line and once for tax. Tax rules differ by state: check
          which of your lines are taxable. This page stores nothing you type unless you turn on &ldquo;Remember my
          company details&rdquo;.
        </p>
        <NextStep
          className="mx-auto mt-10 max-w-6xl print:hidden"
          placement="invoice-builder"
          steps={NEXT_STEPS.invoiceBuilder}
          heading="Invoice done? Here is what to do next."
        />
      </ToolStage>

      <GuideLayout eyebrow="The guide" title="How to write an HVAC invoice that gets paid" nav={NAV}>
        <GuideSection id="template" n={1} title="The HVAC invoice template, field by field">
          <p>
            A good HVAC invoice template saves you twice. Once when you fill it in, because the fields tell the
            technician what to write. And again when the customer reads it, because a clear invoice gets paid without a
            phone call. These are the fields, in order, and why each one is there.
          </p>
          <DataTable
            head={["Section", "Fields", "Why it matters"]}
            rows={[
              ["Header", "Company name, address, phone, email, license number; INVOICE with number, date and due date", "A number that runs in order, and a due date so “when do I pay?” has an answer on the page. Some states require a contractor's license number; check with your licensing board."],
              ["Customer", "Bill-to name, billing address, phone, email; service address if different", "Rentals, property managers and businesses often have a different billing and service address. Put both."],
              ["Equipment", "Make, model, serial, location; refrigerant type and pounds added or recovered", "What turns a generic invoice into an HVAC invoice. The next visit, a warranty claim and a parts lookup all start here."],
              ["Work performed", "Complaint, cause, correction", "Three short lines that explain the job. Customers question an invoice when they cannot see what they paid for."],
              ["Line items", "Service call, labor (hours × rate), each part with part number, refrigerant (lb × price), permit and disposal fees; taxable or not", "States treat parts and labor differently, so mark each line. The labor rate should come from your costs."],
              ["Totals", "Subtotal, discount, tax, total, paid, balance due", "Make the balance the easiest number on the page to find."],
              ["Payment and terms", "How to pay, terms, warranty, permit and inspection, technician, signature", "Tell the customer exactly how to pay, and make it short. A payment link they can open on their phone removes most of the steps."],
            ]}
          />
          <p>
            The labor line should come from your own costs, not a competitor&apos;s price list:{" "}
            <Link href="/insights/how-to-calculate-hvac-labor-rate" className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              the HVAC labor cost workspace
            </Link>{" "}
            works it out from wages, burden, unbilled hours, overhead and margin. The builder&apos;s{" "}
            <strong>Copy blank template</strong> button puts this field list on your clipboard as plain text, and{" "}
            <strong>Print blank</strong> prints an empty invoice to fill in by hand. Neither asks for an email.
          </p>
        </GuideSection>

        <GuideSection
          id="example"
          n={2}
          title="HVAC invoice example: a filled-in service call"
          aside={
            <Callout title="Load it into the builder" tone="brass">
              Press <strong>Load sample</strong> in the builder to open this exact invoice, then change anything and
              watch the totals follow. Every name, address, price and the 7% tax rate are made up for illustration.
            </Callout>
          }
        >
          <p>
            A typical repair: the house is not cooling, the outdoor fan runs but the compressor does not start. The
            technician finds a failed dual run capacitor and a slightly low charge, replaces the capacitor, adds 2 lb of
            R-410A and confirms normal operation.
          </p>
          <DataTable
            caption={`Invoice ${SAMPLE_INVOICE.number}, sample data`}
            head={["Line", "Qty × rate", "Taxable", "Amount"]}
            rows={[
              ...SAMPLE_INVOICE.lines.map((line, index) => [
                line.description + (line.partNumber ? ` (part no. ${line.partNumber})` : ""),
                `${formatQty(line.qty)}${line.kind === "labor" ? " hr" : line.kind === "refrigerant" ? " lb" : ""} × ${formatCents(parseCents(line.price))}`,
                line.taxable ? "Yes" : "No",
                formatCents(T.lineCents[index]),
              ]),
              ["Subtotal", "", "", formatCents(T.subtotalCents)],
              ["Maintenance member discount (on the service call)", "", "", `-${formatCents(T.discountCents)}`],
              [`Sales tax, 7% on taxable lines (${formatCents(T.taxBaseCents)})`, "", "", formatCents(T.taxCents)],
              ["Total", "", "", formatCents(T.totalCents)],
              ["Balance due", "", "", formatCents(SAMPLE.dueNowCents)],
            ]}
          />
          <p>
            Check the arithmetic on any example before you copy it:{" "}
            {SAMPLE_INVOICE.lines.map((line, index) => formatCents(T.lineCents[index])).join(" + ")} ={" "}
            {formatCents(T.subtotalCents)}; less the {formatCents(T.discountCents)} discount is{" "}
            {formatCents(T.subtotalCents - T.discountCents)}; 7% of the {formatCents(T.taxBaseCents)} in taxable lines is{" "}
            {formatCents(T.taxCents)}; total {formatCents(T.totalCents)}. The discount is on the untaxed service call,
            so it does not lower the tax.
          </p>
        </GuideSection>

        <GuideSection id="how-to" n={3} title="How to write an HVAC invoice, step by step">
          <StepList
            steps={[
              { title: "Number and date it", text: "Give every invoice the next number in your sequence, the date of the work and a due date." },
              { title: "Identify both parties", text: "Your company, address, phone and license number where your state requires it; the customer's billing address and, if different, the service address." },
              { title: "Record the equipment", text: "Make, model and serial for each unit worked on, read from the data plate, and where it is." },
              { title: "Record refrigerant", text: "The type and the pounds added or recovered, whenever the system was opened or charged." },
              { title: "Explain the job", text: "Complaint, cause and correction, in plain words the customer will understand." },
              { title: "Itemize the charges", text: "Service call, labor, each part with its part number, refrigerant, permits and disposal fees, each on its own line and marked taxable or not." },
              { title: "Total it", text: "Subtotal, discounts, tax, total, anything already paid and the balance due." },
              { title: "State the terms", text: "When payment is due, how to pay, any late fee policy, and the warranty on labor and parts." },
              { title: "Send it the same day", text: "An invoice sent while the technician is still in the driveway is paid faster than one written up at the end of the week." },
            ]}
          />
        </GuideSection>

        <GuideSection id="types" n={4} title="Service call, installation and maintenance agreement invoices">
          <p>The template is the same, but what matters on the page changes with the kind of work.</p>
          <DataTable
            head={["Invoice", "What it must show", "Watch for"]}
            rows={[
              ["Service call and repair", "Diagnostic or trip fee, labor and parts, a short complaint, cause and correction", "Say whether the service call fee is credited toward the repair if that is your policy. Put recommended work on a separate estimate, not buried in the invoice."],
              ["Installation and replacement", "Make, model and serial of every new piece (outdoor unit, coil or air handler, furnace, thermostat), permit number and inspection status, refrigerant type and charge, removal and disposal, deposit received", "It should match the signed estimate line for line. Spell out the manufacturer warranty and any registration the customer or you must complete."],
              ["Maintenance agreement", "Plan name, the period covered and the visits included; at each visit, what was inspected and cleaned, readings worth keeping, and repairs at the member price", "A zero-balance visit invoice is still worth sending: it shows the customer what the plan is doing for them, which matters at renewal time."],
            ]}
          />
        </GuideSection>

        <GuideSection id="deposits" n={5} title="Deposit and progress invoices">
          <p>
            On installations and multi-day jobs, many shops bill a deposit, then progress invoices, then a final
            invoice for the balance. The builder handles all three:
          </p>
          <BulletList
            items={[
              <><strong>Deposit.</strong> Set the share due now. The invoice shows the job total, the deposit requested and what remains after it.</>,
              <><strong>Progress.</strong> Set the share this invoice bills and anything previously paid. The amount due never exceeds what is still open.</>,
              <><strong>Standard (final).</strong> Enter the deposit already received as paid, and the balance due is the rest.</>,
            ]}
          />
        </GuideSection>

        <GuideSection id="mistakes" n={6} title="Common HVAC invoicing mistakes">
          <BulletList
            items={[
              <><strong>Missing model and serial numbers.</strong> Without them, the next technician starts from scratch and a warranty claim can stall. A photo of the data plate attached to the job settles it.</>,
              <><strong>Refrigerant left off.</strong> Record the type and the pounds added or recovered every time. Customers ask about it, the next visit needs it, and larger commercial systems can carry federal refrigerant recordkeeping requirements under EPA Section 608.</>,
              <><strong>No warranty terms.</strong> If the invoice does not say what your labor warranty is, the customer will remember a longer one than you meant.</>,
              <><strong>No permit number on installs.</strong> Put the permit and inspection status on the final invoice so the customer, and the next buyer of the house, can find it.</>,
              <><strong>Vague or missing payment terms.</strong> No due date means no late payment, technically. State when it is due and how to pay.</>,
              <><strong>One lump-sum line.</strong> A single total with no breakdown invites a phone call. Itemize, even on flat-rate work.</>,
              <><strong>Wrong tax treatment.</strong> States treat parts, labor and installed equipment differently. Mark each line taxable or not and check your state&apos;s rules.</>,
              <><strong>Not matching the estimate.</strong> On installs, an invoice that lists different equipment from the signed estimate confuses the customer and can complicate warranty registration.</>,
              <><strong>Sending it late.</strong> Every day between finishing the job and sending the invoice is a day added to when you get paid.</>,
            ]}
          />
        </GuideSection>

        <GuideSection id="beyond" n={7} title="When a template stops being enough">
          <p>
            A template is fine for a handful of invoices a week. It gets slow when someone in the office rebuilds each
            invoice from the technician&apos;s notes, retypes the customer&apos;s address, and then chases the payment
            by phone.
          </p>
          <p>
            In Altair Operating System the invoice is made from the job, so the customer, the service address, the line
            items from your price book, taxable or not, and your standard invoice note are filled in. You email it, the
            customer can pay by card from a link once Stripe is connected, and cash, checks and partial payments are
            recorded against the same invoice. The{" "}
            <Link href="/hvac-invoicing-software" className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              HVAC invoicing software
            </Link>{" "}
            page shows each step.
          </p>
          <p>
            For more free templates (an estimate template, a maintenance agreement outline, a pricing worksheet and a
            daily checklist), see the{" "}
            <Link href={RESOURCES_TEMPLATES_PATH} className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              templates in the Resource Center
            </Link>
            .
          </p>
        </GuideSection>

        <GuideSection id="faq" n={8} title="Frequently asked questions">
          <FaqList items={FAQ} />
        </GuideSection>

        <RelatedGrid
          title="Keep going"
          links={[
            { href: "/insights/how-to-calculate-hvac-labor-rate", title: "HVAC labor rate calculator", text: "The rate that belongs on the labor line, from your own costs." },
            { href: "/insights/what-to-put-on-an-hvac-invoice", title: "What to put on an HVAC invoice", text: "A line-by-line checklist." },
            { href: "/insights/how-to-price-an-hvac-service-call", title: "How to price an HVAC service call", text: "A worked example of the service call fee." },
            { href: calculatorPath("job-profitability"), title: "Job profitability calculator", text: "Was the job on this invoice worth doing?" },
            { href: "/insights/job-completion-to-invoice-gap", title: "Why invoices lag behind finished jobs", text: "Closing the gap between done and billed." },
            { href: "/hvac-invoicing-software", title: "HVAC invoicing software", text: "The finished job becomes the invoice, and the customer pays from a link." },
          ]}
        />

        <ProductBand
          headline="Invoice from the job, not from scratch."
          text="In Altair Operating System the finished job becomes the invoice, with the customer, address and price-book lines already on it. Email it, and once Stripe is connected the customer can pay by card from a link."
          softwareHref="/hvac-invoicing-software"
          softwareLabel="HVAC invoicing software"
        />
      </GuideLayout>
    </ToolPageShell>
  );
}
