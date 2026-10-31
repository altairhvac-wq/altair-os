import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";

/**
 * The questions a visitor asks before starting a trial, answered with facts
 * the product actually enforces. Every answer here is checked against code:
 * the trial config (catalog.ts, migration 200), the activation page copy,
 * the billing settings page, the technician app, the demo-data loader and
 * the privacy policy. Nothing is promised that a stranger cannot verify by
 * signing up.
 *
 * One list feeds the homepage, the pricing page and the FAQPage JSON-LD, so
 * search engines and visitors read the same words.
 */
export type SiteFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const SUPPORT_EMAIL = "altairhvac@gmail.com";

const TRIAL_DAYS = SAAS_TRIAL_CONFIG.durationDays;

export const SITE_FAQ: readonly SiteFaqItem[] = [
  {
    id: "card",
    question: "Do I need a credit card to start?",
    answer: `No. The free trial runs ${TRIAL_DAYS} days with no card on file. You add a payment method only when you choose a plan.`,
  },
  {
    id: "trial-end",
    question: `What happens when the ${TRIAL_DAYS} days are up?`,
    answer:
      "Nothing is charged. Your workspace and everything in it stays where it is. Choose a plan and add a payment method to keep going; if you do not, the trial simply ends.",
  },
  {
    id: "cancel",
    question: "Can I cancel?",
    answer:
      "Yes. Plans are monthly or annual with no long-term contract, and you manage or cancel your subscription from Settings.",
  },
  {
    id: "onboarding",
    question: "Is onboarding included?",
    answer:
      "Yes. Every plan includes live Zoom onboarding twice a week: setup, workflow guidance and open questions. Come once, or come back whenever it helps.",
  },
  {
    id: "team",
    question: "Can my technicians use it too?",
    answer:
      "Yes. Invite your office and field team from Settings. Technicians get their own mobile view with the day's jobs, and the office keeps the full picture.",
  },
  {
    id: "sample-data",
    question: "Can I look around before adding my own customers?",
    answer:
      "Yes. From Settings you can load a full set of sample customers, jobs, estimates and invoices, try everything, then clear them in one step before adding your own.",
  },
  {
    id: "data",
    question: "Where does my data live, and is it secure?",
    answer:
      "Altair runs on a hosted PostgreSQL database with row-level security, so each company can only ever see its own records. Card payments are processed by Stripe; Altair never stores card numbers.",
  },
  {
    id: "help",
    question: "How do I get help?",
    answer: `Email ${SUPPORT_EMAIL}, or bring your questions to a live onboarding session.`,
  },
];
