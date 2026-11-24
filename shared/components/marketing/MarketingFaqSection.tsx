import { ShowMore } from "@/shared/components/marketing/phone/PhoneLayout";
import { showFirst } from "@/shared/components/marketing/phone/phone-classes";
import { SITE_FAQ } from "@/shared/lib/site/faq";

type FaqEntry = { readonly id: string; readonly question: string; readonly answer: string };

type MarketingFaqSectionProps = {
  /** `dark` for the Mission Control homepage, `light` for the pricing page. */
  variant: "dark" | "light";
  className?: string;
  /**
   * A page's own questions in place of the site FAQ (the invoicing page).
   * The page must then emit FAQPage JSON-LD from this same list, and not the
   * site FAQ's, so the markup never says more than the page.
   */
  items?: readonly FaqEntry[];
  eyebrowText?: string;
  headingText?: string;
  introText?: string;
};

/**
 * "Before you start" questions, answered from the product's own rules.
 *
 * Plain `<details>` elements: they open without JavaScript, the first paint
 * shows every question, and a visitor skimming for "credit card" finds the
 * answer with a tap. Every page that renders this also emits the matching
 * FAQPage JSON-LD (`buildFaqStructuredData`), from the same list.
 */
export function MarketingFaqSection({
  variant,
  className = "",
  items = SITE_FAQ,
  eyebrowText = "Before you start",
  headingText = "Questions owners ask before the trial.",
  introText = "Straight answers, the same ones the product enforces.",
}: MarketingFaqSectionProps) {
  const dark = variant === "dark";
  const eyebrow = dark ? "text-[#c2a05a]" : "text-[#77591B]";
  const heading = dark ? "text-[#fff9ea]" : "text-[#0A0A0A]";
  const intro = dark ? "text-[#c9bfae]" : "text-stone-600";
  const item = dark
    ? "border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)] open:bg-[rgba(24,28,22,0.7)]"
    : "border-stone-200/80 bg-white open:bg-[#FFFCF8]";
  const question = dark ? "text-[#f3ebdd]" : "text-stone-800";
  const answer = dark ? "text-[#c9bfae]" : "text-stone-600";
  const marker = dark ? "text-[#c2a05a]" : "text-[#77591B]";

  return (
    <section
      id="faq"
      aria-labelledby="site-faq-heading"
      className={`relative scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20 ${className}`}
    >
      <div className="mx-auto max-w-3xl">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${eyebrow}`}>
          {eyebrowText}
        </p>
        <h2
          id="site-faq-heading"
          className={`mt-3 text-[1.6rem] font-semibold tracking-tight sm:text-[2rem] sm:leading-[1.2] ${heading}`}
        >
          {headingText}
        </h2>
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed sm:text-base ${intro}`}>
          {introText}
        </p>

        {/* On a phone the first four questions show; the rest wait behind "Show more". */}
        <ShowMore hidden={Math.max(0, items.length - 4)} noun="more questions" tone={dark ? "dark" : "light"}>
        <div className={`mt-8 space-y-3 ${showFirst[4]}`}>
          {items.map((entry) => (
            <details
              key={entry.id}
              className={`group rounded-xl border transition-colors ${item}`}
            >
              <summary
                className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-left text-[15px] font-semibold [&::-webkit-details-marker]:hidden ${question}`}
              >
                <span>{entry.question}</span>
                <span
                  className={`shrink-0 text-lg leading-none transition-transform group-open:rotate-45 ${marker}`}
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className={`px-5 pb-4 text-sm leading-relaxed sm:text-[15px] ${answer}`}>
                {entry.answer}
              </p>
            </details>
          ))}
        </div>
        </ShowMore>
      </div>
    </section>
  );
}
