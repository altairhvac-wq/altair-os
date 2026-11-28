import type { Metadata } from "next";
import Link from "next/link";
import { FlatRatePriceList } from "@/shared/components/resources/flat-rate/FlatRatePriceList";
import {
  BulletList,
  Callout,
  DataTable,
  FaqList,
  GuideLayout,
  GuideSection,
  MathTable,
  ToolHero,
  ToolPageShell,
  ToolStage,
  type FaqItem,
} from "@/shared/components/resources/tools/ToolGuide";
import { SavedNumbersNote } from "@/shared/components/resources/SavedNumbersNote";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { RESOURCES_FLAT_RATE_PATH, RESOURCES_PATH, calculatorPath } from "@/shared/lib/resources/catalog";
import { FLAT_RATE_SAMPLE_AFTER_HOURS, FLAT_RATE_SAMPLE_RATE, FLAT_RATE_SAMPLE_TASKS, markupToMargin, priceListLine } from "@/shared/lib/resources/flat-rate-list";
import { FLAT_RATE_SAVED_NUMBERS_NOTE } from "@/shared/lib/resources/saved-numbers";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { buildPublicSocialMetadata, PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";

/**
 * /resources/flat-rate-price-list: the flat-rate price list builder.
 *
 * The builder is the only client component; the guide, the worked example and
 * the FAQ are server-rendered. The example is priced by the builder's own
 * function from the builder's own sample tasks, so the page and the tool
 * cannot disagree. Nothing typed into the builder leaves the browser.
 */

const TITLE = "HVAC Flat-Rate Price List Builder: Price Book from Your Rate";
const H1 = "HVAC flat-rate price list builder";
const DESCRIPTION =
  "Build an HVAC flat-rate price list from your own labor rate: book hours, part cost and markup per task, with after-hours prices. Print it or copy it out.";
const MODIFIED = "2026-11-27T00:00:00.000Z";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: RESOURCES_FLAT_RATE_PATH, title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

/** The first sample task, priced by the tool's own function. */
const EX = FLAT_RATE_SAMPLE_TASKS[0];
const EXACT = priceListLine(EX, FLAT_RATE_SAMPLE_RATE, FLAT_RATE_SAMPLE_AFTER_HOURS, "exact");
const ROUNDED = priceListLine(EX, FLAT_RATE_SAMPLE_RATE, FLAT_RATE_SAMPLE_AFTER_HOURS, "dollar");

const FAQ: readonly FaqItem[] = [
  {
    question: "What is flat-rate pricing in HVAC?",
    answer:
      "The customer is quoted one price for a task before the work starts, instead of an hourly rate plus parts added up afterwards. The price is built from the hours the task normally takes, your labor rate and the part with its markup. If the job runs long, the price does not change.",
  },
  {
    question: "How do I calculate a flat-rate price?",
    answer: `Multiply the book hours for the task by your labor rate, then add the part cost with your markup. In this page's example, ${EX.bookHours} hours at $${FLAT_RATE_SAMPLE_RATE} is ${usd(EXACT.labor)} of labor, and an $${EX.partCost} part with a ${EX.markupPercent}% markup is ${usd(EXACT.part)}: ${usd(EXACT.unrounded)}, listed at ${usd(ROUNDED.standard)}.`,
  },
  {
    question: "Where do book hours come from?",
    answer:
      "From your own finished jobs. Look at how long the task took the last several times, leave out the drive, and use the average. Published flat-rate books give starting points, but your technicians, your trucks and your area set the real number.",
  },
  {
    question: "What markup should I put on parts?",
    answer:
      "That is your decision, and this page does not quote an industry figure. Know what the markup leaves: a 100% markup doubles the part's cost and leaves half of its price as margin; a 50% markup leaves a third. Small, cheap parts usually carry a higher markup than expensive ones.",
  },
  {
    question: "Is flat rate better than time and materials?",
    answer:
      "Each has a use. Flat rate gives the customer a price up front and rewards a technician who works well. Time and materials fits work nobody can scope in advance. Many shops use flat rate for common repairs and time and materials for the rest.",
  },
];

const NAV = [
  { id: "how-it-works", label: "How a price is built" },
  { id: "book-hours", label: "Getting book hours right" },
  { id: "parts", label: "Markup and margin on parts" },
  { id: "after-hours", label: "After-hours prices" },
  { id: "faq", label: "Questions owners ask" },
];

export default function FlatRatePriceListPage() {
  const url = `${PUBLIC_SITE_ORIGIN}${RESOURCES_FLAT_RATE_PATH}`;
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
              name: "HVAC Flat-Rate Price List Builder",
              url: `${url}#price-list`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (runs in the browser)",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Free tools", item: `${PUBLIC_SITE_ORIGIN}${RESOURCES_PATH}` },
                { "@type": "ListItem", position: 2, name: H1, item: url },
              ],
            },
          ],
        }}
      />
      <JsonLdScript data={buildFaqPageStructuredData(FAQ)} />

      <ToolHero
        crumb="Flat-rate price list"
        eyebrow="Free tool · Price list builder"
        title={H1}
        question="One price per task, built from your own labor rate. Print it for the truck."
        needs="Your labor rate, and for each task how long it usually takes and what the part costs you."
        lead={
          <p>
            A flat-rate price list gives the customer one number before the work starts, and the same number whichever
            technician runs the call. List your tasks with the hours each one takes and what the part costs you; this
            builder prices every one at your labor rate, adds an after-hours price beside it, and prints as a clean
            sheet for the truck.
          </p>
        }
        updated={{ iso: MODIFIED, label: "November 27, 2026" }}
        facts={["No sign-up", "Standard and after-hours prices", "Print, save or copy to a spreadsheet"]}
        jumpLinks={[
          { href: "#price-list", label: "Open the builder" },
          { href: "#how-it-works", label: "How a price is built" },
          { href: "#parts", label: "Markup and margin" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      <ToolStage>
        <FlatRatePriceList />
        <SavedNumbersNote className="mx-auto mt-8 max-w-4xl" text={FLAT_RATE_SAVED_NUMBERS_NOTE} href="/hvac-estimating-software" linkText="HVAC estimating software" />
        <NextStep
          className="mx-auto mt-10 max-w-6xl print:hidden"
          placement="flat-rate-price-list"
          steps={NEXT_STEPS.flatRateList}
          heading="List done? Here is where the prices go next."
        />
      </ToolStage>

      <GuideLayout eyebrow="The guide" title="How to build a flat-rate price list" nav={NAV}>
        <GuideSection
          id="how-it-works"
          n={1}
          title="How a flat-rate price is built"
          aside={
            <Callout title="The formula" tone="brass">
              <p className="font-mono text-[13px] leading-relaxed">
                price = book hours × labor rate
                <br />
                {"      "}+ part cost × (1 + markup)
              </p>
            </Callout>
          }
        >
          <p>
            A flat-rate price has two parts: the labor and the part. The labor is the hours the task normally takes,
            called book hours, multiplied by your labor rate. The part is what it costs you plus your markup. Add them
            and you have the price the customer hears.
          </p>
          <MathTable
            caption={`Worked example: ${EX.name.toLowerCase()}. Sample numbers.`}
            rows={[
              { label: "Labor", working: `${EX.bookHours} hours × $${FLAT_RATE_SAMPLE_RATE}`, value: usd(EXACT.labor) },
              { label: "Part", working: `$${EX.partCost} × (1 + ${EX.markupPercent}%)`, value: usd(EXACT.part) },
              { label: "Price before rounding", working: `${usd(EXACT.labor)} + ${usd(EXACT.part)}`, value: usd(EXACT.unrounded) },
              { label: "Listed price", working: "rounded up to the next dollar", value: usd(ROUNDED.standard), strong: true },
              { label: "After hours", working: `${usd(EXACT.labor)} × ${FLAT_RATE_SAMPLE_AFTER_HOURS} + ${usd(EXACT.part)}, rounded up`, value: usd(ROUNDED.afterHours) },
            ]}
          />
          <p>
            Everything rests on the labor rate. A list built on a rate that is too low loses a little on every task,
            every day. If you have not worked yours out from your own costs, the{" "}
            <Link href={LABOR_WORKSPACE_PATH} className={link}>
              labor rate calculator
            </Link>{" "}
            does it in about ten minutes.
          </p>
        </GuideSection>

        <GuideSection id="book-hours" n={2} title="Getting book hours right">
          <p>
            Book hours are the average time a task takes your shop, not the fastest time and not the worst day. They
            are the part of a flat-rate price that owners most often guess at.
          </p>
          <BulletList
            items={[
              "Use your own finished jobs. Look at the last several times you did the task and average the time on site.",
              "Leave the drive out. Your labor rate already spreads drive time across every billed hour, so adding it here charges for it twice.",
              "Count the whole task: getting to the equipment, the repair, testing it, and cleaning up.",
              "Check it twice a year. If a task keeps running long, the book hours are wrong, not the technician.",
            ]}
          />
          <p>
            The{" "}
            <Link href={calculatorPath("job-profitability")} className={link}>
              job profitability calculator
            </Link>{" "}
            shows whether a finished flat-rate job made what the list said it would.
          </p>
        </GuideSection>

        <GuideSection id="parts" n={3} title="Markup and margin on parts are not the same number">
          <p>
            Markup is what you add to the part&apos;s cost. Margin is the share of the selling price you keep. They
            are easy to mix up, and the mix-up always goes against you.
          </p>
          <DataTable
            caption="What a markup leaves as margin"
            head={["Markup on cost", "A $40 part sells for", "Margin on the price"]}
            rows={[25, 50, 100, 150].map((markup) => [`${markup}%`, usd(40 * (1 + markup / 100)), `${(markupToMargin(markup) * 100).toFixed(1)}%`])}
          />
          <p>
            A shop that wants half of a part&apos;s price as margin needs a 100% markup, not 50%.
          </p>
        </GuideSection>

        <GuideSection id="after-hours" n={4} title="After-hours prices">
          <p>
            Nights, weekends and holidays cost you more in wages, so the list carries a second price. The builder
            applies your multiplier to the labor only. The part costs you the same at midnight as at noon, so it is
            not multiplied.
          </p>
          <p>
            Say when after-hours prices apply, on the list and on the phone, before the technician is sent. A separate
            service call fee is priced in the{" "}
            <Link href={calculatorPath("service-call-fee")} className={link}>
              service call fee calculator
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
