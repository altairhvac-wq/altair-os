import { SAAS_PLAN_DESCRIPTIONS } from "@/shared/components/pricing/plan-descriptions";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";
import { PRICING_FACTS, formatUsd, pricedPlans } from "@/shared/lib/pricing/plan-calculator";

/**
 * The words on /pricing that are not the calculator.
 *
 * ============ ONLY WHAT THE CODE AND THE TERMS SAY ============
 * Every price, limit and trial fact is read from the plan catalog
 * (lib/saas-billing/catalog.ts) through plan-calculator.ts. The contract
 * terms repeat, in plain words, what these sources already say:
 * - trial length, no card, does not convert on its own: SAAS_TRIAL_CONFIG
 *   (catalog.ts, migration 200) and the site FAQ (shared/lib/site/faq.ts);
 * - the trial gets the Pro user allowance: SAAS_TRIAL_ACCOUNT_ALLOWANCE;
 * - monthly or annual, no long-term contract, cancel from Settings: faq.ts;
 * - renews until canceled, access to the end of the paid period, refunds
 *   only where the law requires: /terms section 3;
 * - your data is yours, export from Settings, email after access ends:
 *   /terms section 2 and faq.ts ("data-out");
 * - a user is anyone who signs in, pending invitations hold one:
 *   catalog.ts (ACCOUNTS PER PLAN) and lib/saas-billing/accounts.ts;
 * - move to a larger plan in Settings > Billing: accounts.ts;
 * - terms changes announced 14 days ahead: /terms section 10;
 * - no fee added to customers' card payments: lib/payments has no
 *   application fee; payments run on the company's own Stripe account.
 */

const plans = pricedPlans();
const starter = plans[0];
const trialDays = PRICING_FACTS.trialDays;

function planPrices(): string {
  return plans.map((plan) => `${plan.label} ${formatUsd(plan.monthlyPriceUsd)}`).join(", ");
}

function planUsers(plan: (typeof plans)[number]): string {
  if (plan.extraUserMonthlyUsd !== null) {
    return `${plan.includedUsers} users, then ${formatUsd(plan.extraUserMonthlyUsd)}/month each`;
  }
  return plan.includedUsers === 1 ? "1 user" : `up to ${plan.includedUsers} users`;
}

export const PRICING_PATH = "/pricing";

/** 34 characters + the 26-character product suffix = 60. */
export const PRICING_META = {
  title: `HVAC Software Pricing, From ${starter ? formatUsd(starter.monthlyPriceUsd) : ""}/mo`,
  description: `HVAC software pricing: ${planPrices()} a month, every feature on every plan. ${trialDays}-day free trial, no card. Cancel any time.`,
} as const;

/** The features every plan includes (the pricing page's long-standing list). */
export const PLATFORM_FEATURES = [
  "Dispatch & Scheduling",
  "Customer Management",
  "Customer 360",
  "Estimates & Approvals",
  "Invoices & Payments",
  "Equipment Tracking",
  "Technician Phone View",
  "Time Tracking",
  "Team Management",
  "Business Reporting",
  "AI Drafting for Follow-Ups and Summaries",
  "One-on-One Setup Call",
] as const;

/** "For a growing shop: ..." -> "A growing shop: ...", for a table cell. */
function madeFor(planKey: (typeof plans)[number]["planKey"]): string {
  const text = SAAS_PLAN_DESCRIPTIONS[planKey].replace(/^For /, "").replace(/\.$/, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type ComparisonCell = string | boolean;
export type ComparisonRow = { readonly label: string; readonly cells: readonly ComparisonCell[] };

/** The plan comparison table, one cell per plan in display order. */
export function planComparisonRows(): { readonly money: ComparisonRow[]; readonly features: ComparisonRow[] } {
  return {
    money: [
      { label: "Made for", cells: plans.map((plan) => madeFor(plan.planKey)) },
      { label: "Monthly price", cells: plans.map((plan) => `${formatUsd(plan.monthlyPriceUsd)}/month`) },
      { label: "Yearly price", cells: plans.map((plan) => `${formatUsd(plan.annualPriceUsd)}/year`) },
      { label: "Saved by paying yearly", cells: plans.map((plan) => formatUsd(plan.annualSavingsUsd)) },
      { label: "Users included", cells: plans.map((plan) => (plan.includedUsers === 1 ? "1" : plan.extraUserMonthlyUsd !== null ? String(plan.includedUsers) : `Up to ${plan.includedUsers}`)) },
      {
        label: "More users",
        cells: plans.map((plan) => (plan.extraUserMonthlyUsd !== null ? `${formatUsd(plan.extraUserMonthlyUsd)}/month each` : "Move up a plan")),
      },
      { label: `${trialDays}-day free trial, no card`, cells: plans.map(() => true) },
    ],
    features: PLATFORM_FEATURES.map((feature) => ({ label: feature, cells: plans.map(() => true) })),
  };
}

export type ContractTerm = { readonly title: string; readonly text: string };

export const CONTRACT_TERMS: readonly ContractTerm[] = [
  {
    title: `${trialDays}-day free trial, no card`,
    text: `Start without a card. When the ${trialDays} days end, nothing is charged: choose a plan and add a card to keep going, or let it end. The trial never turns into a paid plan on its own.`,
  },
  {
    title: "No long-term contract",
    text: "Pay monthly or yearly. A plan renews at the end of each month or year until you cancel it.",
  },
  {
    title: "Cancel from Settings",
    text: "Cancel any time in Settings. You keep access until the end of the period you paid for. Payments are not refunded, except where the law requires it.",
  },
  {
    title: "Your data stays yours",
    text: `Everything you enter is yours. An owner or admin can download every record as one file from Settings, during the trial or while subscribed. If your access has ended, email ${SUPPORT_EMAIL} and we send you the file.`,
  },
  {
    title: "Who counts as a user",
    text: `Anyone who signs in: owner, office or technician. A pending invitation holds a seat until it is accepted or cancelled. The trial includes up to ${PRICING_FACTS.trialUsers} users.`,
  },
  {
    title: "Changing plans",
    text: "Move to a larger plan from Settings > Billing when the team grows. Card payments run through Stripe, and Altair never stores card numbers.",
  },
];

export type PricingFaqItem = { readonly id: string; readonly question: string; readonly answer: string };

export const PRICING_FAQ: readonly PricingFaqItem[] = [
  {
    id: "cost",
    question: "How much does Altair Operating System cost?",
    answer: `${plans.map((plan) => `${plan.label} is ${formatUsd(plan.monthlyPriceUsd)}/month or ${formatUsd(plan.annualPriceUsd)}/year for ${planUsers(plan)}`).join(". ")}. Prices are in US dollars.`,
  },
  {
    id: "trial",
    question: "Is there a free trial, and do I need a card?",
    answer: `Yes, ${trialDays} days, and no card to start. The trial includes up to ${PRICING_FACTS.trialUsers} users so your whole team can try it. When it ends nothing is charged; it only becomes a paid plan if you choose one and add a card.`,
  },
  {
    id: "features",
    question: "Do the plans have different features?",
    answer:
      "No. Every plan includes every feature, from dispatch and estimates to invoices, payments, the technician phone view, time tracking and reports, plus a one-on-one setup call. The plans differ only in how many users they include.",
  },
  {
    id: "user",
    question: "What counts as a user?",
    answer:
      "Anyone who signs in: the owner, office staff and technicians alike. A pending invitation holds a seat until it is accepted or cancelled, and a suspended member does not count.",
  },
  {
    id: "big-team",
    question: "What if my team has more than 10 people?",
    answer: (() => {
      const pro = plans.find((plan) => plan.extraUserMonthlyUsd !== null);
      return pro
        ? `${pro.label} includes ${pro.includedUsers} users, and each user after that is ${formatUsd(pro.extraUserMonthlyUsd ?? 0)}/month. A team of ${pro.includedUsers + 2} on monthly billing pays ${formatUsd(pro.monthlyPriceUsd + 2 * (pro.extraUserMonthlyUsd ?? 0))} a month.`
        : "Email us and we will work out the plan with you.";
    })(),
  },
  {
    id: "yearly",
    question: "How much do I save by paying yearly?",
    answer: `A yearly plan costs ${plans[0]?.annualSavingsMonths ? `${12 - plans[0].annualSavingsMonths} months' price for 12 months` : "less than 12 monthly payments"}: ${plans.map((plan) => `${plan.label} saves ${formatUsd(plan.annualSavingsUsd)}`).join(", ")} a year compared with paying monthly.`,
  },
  {
    id: "cancel",
    question: "Is there a contract? Can I cancel?",
    answer:
      "There is no long-term contract. Plans are monthly or yearly and renew until you cancel, which you do from Settings. You keep access until the end of the period you paid for, and payments are not refunded except where the law requires it.",
  },
  {
    id: "data",
    question: "What happens to my data if I cancel or the trial ends?",
    answer: `Your records stay where they are, and they are yours. An owner or admin can download every record as one file from Settings during the trial or while subscribed. If your access has already ended, email ${SUPPORT_EMAIL} and we send you the file.`,
  },
  {
    id: "change",
    question: "Can I change plans later?",
    answer: "Yes. Move to a larger plan from Settings > Billing when you add people. The plan finder on this page shows when your team will outgrow the plan you pick.",
  },
  {
    id: "setup",
    question: "Is setup help included?",
    answer:
      "Yes. Every plan includes a free one-on-one setup call on Zoom, booked from your workspace at a time that suits you: setup, workflow guidance and your questions.",
  },
  {
    id: "card-fees",
    question: "Does Altair take a cut of my customers' card payments?",
    answer:
      "No. When you connect your own Stripe account, customers pay invoices by card through it and Altair adds no fee of its own. Stripe's processing fees apply to your Stripe account, and Altair never stores card numbers.",
  },
];
