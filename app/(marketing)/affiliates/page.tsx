import type { Metadata } from "next";
import Link from "next/link";
import { listPublicSaasCatalogPlans } from "@/lib/saas-billing/catalog";
import { AffiliateApplicationForm } from "@/shared/components/affiliates/AffiliateApplicationForm";
import { dirCard, dirEyebrow, dirLink, dirPrimaryButton } from "@/shared/components/directory/directory-styles";
import { ResourceChrome, ResourceMain } from "@/shared/components/resources/ResourcePageShell";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import { AFFILIATES_PATH, AFFILIATE_PROGRAM, formatCommissionUsd } from "@/shared/types/affiliates";

const P = AFFILIATE_PROGRAM;
const [PARTNER, SILVER, GOLD] = P.tiers;

const TITLE = "Affiliate program";
const DESCRIPTION = `Recommend Altair Operating System to the trade shops you work with and earn ${PARTNER.ratePercent}% of what they pay for ${P.commissionMonths} months, rising to ${GOLD.ratePercent}%. ${P.foundingPlaces} founding places. Apply here.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: AFFILIATES_PATH, title: TITLE, description: DESCRIPTION }),
};

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: "Try it first",
    body: "Apply below. If we are a fit you get a free account, and you use it for as long as you like before you say a word to anyone.",
  },
  {
    title: "Share your code",
    body: "You get a personal code. A shop that uses it gets its first month free, and the code is how we know you sent them.",
  },
  {
    title: "Get paid every month",
    body: `On the ${P.payoutDayOfMonth}th, with a statement that lists every customer and every payment.`,
  },
];

const WHO: readonly string[] = [
  "Business coaches and consultants who work with contractors",
  "Bookkeepers and accountants with trade clients",
  "Podcast and YouTube hosts who talk about running a trade business",
  "Trainers and educators whose students go out on their own",
  "Agencies and suppliers who talk to small shops every week",
];

const PERKS: readonly { title: string; body: string }[] = [
  {
    title: "A rate that never drops",
    body: "Founding partners keep the highest tier they reach, even if a customer later cancels.",
  },
  {
    title: "Something for your people",
    body: "Their first month is free with your code. You are handing them a saving, not a sales pitch.",
  },
  {
    title: "A free account of your own",
    body: "The full product, to use and to show. You should never recommend something you have not run yourself.",
  },
  {
    title: "A direct line to the founder",
    body: "Tell us what your people need. With ten partners, you are heard.",
  },
  {
    title: "Help making things",
    body: "A walk-through video, an article with your name on it, or a guest spot on our HVAC training channel.",
  },
  {
    title: "A plain monthly statement",
    body: "Every customer, every payment, what you earned and when it is paid.",
  },
];

const RULES: readonly { title: string; body: string }[] = [
  {
    title: "Say that you earn a commission",
    body: "Every time you recommend it, right beside the recommendation, and out loud in a video. A line such as “I earn a commission if you sign up with my code” is enough. A link labelled “affiliate link” on its own is not.",
  },
  {
    title: "Tell the truth about the product",
    body: "Say what you have seen it do. We give you a short facts sheet, including what it does not do yet.",
  },
  {
    title: "New customers only, and not yourself",
    body: "A referral is a company that has never had an account. Your own company, one you part-own, or your employer does not count.",
  },
  {
    title: "No ads on our name, no spam",
    body: "No paid search ads on “Altair Operating System” or our web address, no bought email lists, no coupon sites, no fake reviews, and no posing as us.",
  },
];

const FAQ: readonly { question: string; answer: string }[] = [
  {
    question: "What exactly do I earn?",
    answer: `A percentage of the subscription money a shop you referred actually pays, for ${P.commissionMonths} months from its first payment. Extra users on the Pro plan count. Sales tax, refunded payments and the free first month do not.`,
  },
  {
    question: "When am I paid?",
    answer: `Each payment a customer makes is held for ${P.holdDays} days in case it is refunded or disputed. On the ${P.payoutDayOfMonth}th of each month we pay everything that came out of that hold the month before, by PayPal or bank transfer. Balances under $${P.minimumPayoutUsd} roll to the next month.`,
  },
  {
    question: "How do the pay bumps work?",
    answer: `You start at ${PARTNER.ratePercent}%. When ${SILVER.payingCustomers} shops you sent are paying customers you move to ${SILVER.ratePercent}%, and at ${GOLD.payingCustomers} you move to ${GOLD.ratePercent}%. The new rate starts the next month and covers every customer of yours still inside their ${P.commissionMonths} months, not only new ones. A paying customer is one that has paid for ${P.payingCustomerMonths} months, or for a year up front.`,
  },
  {
    question: "What if a customer forgets my code?",
    answer: `Tell us within ${P.missedCodeClaimDays} days of their signup. We check and add them to your account by hand.`,
  },
  {
    question: "What if a customer cancels or gets a refund?",
    answer: "You keep what was already paid out on payments they kept. A refunded or disputed payment earns nothing, and if it had already been paid out, it comes off your next payment.",
  },
  {
    question: `What happens after ${P.commissionMonths} months?`,
    answer: `Commission on that customer ends. There is no limit on how many customers you can refer, and each one has its own ${P.commissionMonths} months.`,
  },
  {
    question: "Do I have to be a customer?",
    answer: "No. You get a free account so you can use the product and show it. We do ask that you use it before you recommend it.",
  },
  {
    question: "Is there a contract?",
    answer: "Yes. This page is a plain summary. Before your first payout you sign the full partner agreement, and US partners fill in a W-9 tax form. You are an independent partner, not an employee, and either of us can end it. If we end it and you kept the rules, customers you already sent keep paying out for the rest of their months.",
  },
  {
    question: "Who can apply?",
    answer: "People and businesses in the United States, for now. Applying does not commit you to anything.",
  },
];

const sectionTitle = "text-2xl font-semibold tracking-tight text-[#0A0A0A]";
const sectionIntro = "mt-2 max-w-2xl text-base leading-relaxed text-stone-600";

/**
 * The affiliate program: what it pays, who it is for, the rules, and the
 * application. Static: it reads the program's numbers from
 * shared/types/affiliates.ts and the plan prices from the billing catalog, so
 * the worked examples cannot disagree with the pricing page.
 */
export default function AffiliatesPage() {
  const plans = listPublicSaasCatalogPlans().filter((plan) => plan.monthlyPriceUsd !== null);
  const example = plans.find((plan) => plan.planKey === "growth") ?? plans[0];
  const examplePrice = example?.monthlyPriceUsd ?? 0;

  return (
    <ResourceChrome>
      <ResourceMain>
        <header>
          <p className={dirEyebrow}>Affiliate program · {P.foundingPlaces} founding places</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
            Recommend software you would use yourself. Earn {PARTNER.ratePercent}% for a year.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Altair Operating System runs the office for small HVAC and trade shops: scheduling, dispatch, estimates,
            invoices and a phone app for the techs. If the owners you work with trust your word, we will pay you{" "}
            {PARTNER.ratePercent}% of what each shop you send pays for its first {P.commissionMonths} months, rising to{" "}
            {GOLD.ratePercent}%.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a href="#apply" className={dirPrimaryButton}>
              Apply to be a partner
            </a>
            <a href="#earn" className={dirLink}>
              See what you earn
            </a>
          </div>
        </header>

        <section aria-labelledby="who-heading" className="mt-14">
          <h2 id="who-heading" className={sectionTitle}>
            Who it is for
          </h2>
          <p className={sectionIntro}>
            People whose audience owns or runs a small trade shop, about one to fifteen trucks, and who would only
            recommend something they believe in.
          </p>
          <ul className="mt-5 grid gap-x-8 gap-y-2.5 text-sm leading-relaxed text-stone-800 sm:grid-cols-2">
            {WHO.map((line) => (
              <li key={line} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A4823A]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-stone-600">
            It is not for coupon sites, paid-ad resellers, or anyone who would recommend it without trying it. The
            product is new, and we would rather have ten partners who know it well than a hundred who do not.
          </p>
        </section>

        <section aria-labelledby="how-heading" className="mt-14">
          <h2 id="how-heading" className={sectionTitle}>
            How it works
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className={`px-5 py-5 ${dirCard}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A0A0A] font-mono text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="mt-3 text-base font-semibold text-[#0A0A0A]">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="earn" aria-labelledby="earn-heading" className="mt-14 scroll-mt-24">
          <h2 id="earn-heading" className={sectionTitle}>
            What you earn
          </h2>
          <p className={sectionIntro}>
            A share of what each shop pays, every month, for its first {P.commissionMonths} months. The more shops you
            send, the bigger the share, and a raise covers the shops you already sent.
          </p>

          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {P.tiers.map((tier) => (
              <li key={tier.key} className={`px-5 py-5 ${dirCard}`}>
                <p className={dirEyebrow}>{tier.label}</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-[#0A0A0A]">{tier.ratePercent}%</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  {tier.payingCustomers === 0
                    ? "From your first customer."
                    : `Once ${tier.payingCustomers} shops you sent are paying customers.`}
                </p>
              </li>
            ))}
          </ol>

          <div className={`mt-4 overflow-hidden ${dirCard}`}>
            <table className="w-full text-left text-sm">
              <caption className="border-b border-stone-200 px-4 py-3 text-left text-sm text-stone-600 sm:px-5">
                What one shop earns you each month, for {P.commissionMonths} months
              </caption>
              <thead>
                <tr className="text-xs uppercase tracking-wide text-stone-500">
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">
                    Their plan
                  </th>
                  {P.tiers.map((tier) => (
                    <th key={tier.key} scope="col" className="px-2 py-2.5 text-right font-medium last:pr-4 sm:px-5 sm:last:pr-5">
                      {tier.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {plans.map((plan) => (
                  <tr key={plan.planKey} className="border-t border-stone-100">
                    <th scope="row" className="px-4 py-3 font-medium text-stone-900 sm:px-5">
                      {plan.label}
                      <span className="block text-xs font-normal text-stone-500">${plan.monthlyPriceUsd} a month</span>
                    </th>
                    {P.tiers.map((tier) => (
                      <td key={tier.key} className="px-2 py-3 text-right text-stone-900 last:pr-4 sm:px-5 sm:last:pr-5">
                        {formatCommissionUsd(plan.monthlyPriceUsd ?? 0, tier.ratePercent)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {example ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
              An example: one shop on the {example.label} plan pays ${examplePrice} a month. At {PARTNER.ratePercent}%
              you earn {formatCommissionUsd(examplePrice, PARTNER.ratePercent)} a month, which is{" "}
              {formatCommissionUsd(examplePrice * P.commissionMonths, PARTNER.ratePercent)} over the year. Plan prices
              are on the{" "}
              <Link href="/pricing" className={dirLink}>
                pricing page
              </Link>
              . A shop that pays for a year up front earns you the same share of that one payment.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="perks-heading" className="mt-14">
          <h2 id="perks-heading" className={sectionTitle}>
            What founding partners get
          </h2>
          <p className={sectionIntro}>
            There are {P.foundingPlaces} founding places. After that the program may change; for founding partners it
            does not get worse.
          </p>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {PERKS.map((perk) => (
              <div key={perk.title}>
                <dt className="text-base font-semibold text-[#0A0A0A]">{perk.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-stone-600">{perk.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="rules-heading" className="mt-14">
          <h2 id="rules-heading" className={sectionTitle}>
            The rules, in plain words
          </h2>
          <p className={sectionIntro}>Four of them. They protect your name as much as ours.</p>
          <ol className="mt-5 space-y-3">
            {RULES.map((rule, index) => (
              <li key={rule.title} className={`flex gap-4 px-5 py-4 ${dirCard}`}>
                <span className="font-mono text-sm font-semibold text-[#77591B]">{index + 1}</span>
                <div>
                  <p className="text-base font-semibold text-[#0A0A0A]">{rule.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{rule.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="faq-heading" className="mt-14">
          <h2 id="faq-heading" className={sectionTitle}>
            Questions
          </h2>
          <div className={`mt-5 divide-y divide-stone-200 ${dirCard}`}>
            {FAQ.map((item) => (
              <details key={item.question} className="group px-5 py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-base font-medium text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span aria-hidden="true" className="text-xl leading-none text-stone-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 pr-6 text-sm leading-relaxed text-stone-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="apply" aria-labelledby="apply-heading" className="mt-14 scroll-mt-24">
          <h2 id="apply-heading" className={sectionTitle}>
            Apply
          </h2>
          <p className={sectionIntro}>
            About three minutes. A person reads every application and replies within 5 business days.
          </p>
          <div className="mt-6">
            <AffiliateApplicationForm />
          </div>
          <p className="mt-6 text-xs leading-relaxed text-stone-500">
            Rather ask a question first? Write to{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className={dirLink}>
              {SUPPORT_EMAIL}
            </a>
            . How we handle your details is in the{" "}
            <Link href="/privacy" className={dirLink}>
              privacy policy
            </Link>
            .
          </p>
        </section>
      </ResourceMain>
    </ResourceChrome>
  );
}
