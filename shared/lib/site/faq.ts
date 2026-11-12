import { SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

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

export { SUPPORT_EMAIL };

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
      "Yes. Invite your office and field team from Settings; technicians get their own mobile view with the day's jobs. Plans differ by users: Starter includes 1, Growth up to 5, Pro 10 and then $15/month for each extra user. A user is anyone who signs in: owner, office or technician.",
  },
  {
    id: "phone-app",
    question: "Is there a phone app?",
    answer:
      "It runs in the phone's web browser on iPhone and Android, and you can add it to the home screen so it opens like an app. There is nothing to download from an app store.",
  },
  {
    id: "import",
    question: "Can I bring my customers over from another system?",
    answer:
      "Yes. Import your customer list as a CSV file exported from ServiceTitan, Housecall Pro, Jobber, QuickBooks or a spreadsheet. It brings over names, phone numbers, emails and addresses. Equipment and job history do not come across.",
  },
  {
    id: "quickbooks",
    question: "Does it work with QuickBooks?",
    answer:
      "Not yet. Altair does not sync with QuickBooks today. Invoices, payments and expenses are recorded in Altair, and you can import a customer list exported from QuickBooks.",
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
    id: "data-out",
    question: "Can I get my data out if I leave?",
    answer: `Yes. Your data is yours. Email ${SUPPORT_EMAIL} and we send you a file with everything in your workspace. A self-serve export button is not in the product yet.`,
  },
  {
    id: "help",
    question: "How do I get help?",
    answer: `Email ${SUPPORT_EMAIL}, or bring your questions to a live onboarding session.`,
  },
];
