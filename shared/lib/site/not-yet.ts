/**
 * What Altair does not do yet, in one list.
 *
 * ============ WHY THE SITE SAYS THIS OUT LOUD ============
 * A small-shop owner comparing tools will find these gaps in the first week
 * of a trial. Saying them on the pricing page costs nothing a trial would not
 * cost anyway, and it is the reason the rest of the page can be believed.
 * The comparison pages already carry the same facts in prose
 * (shared/lib/site/comparison-pages.ts); the landing pages carry the ones
 * that belong to their topic (shared/lib/site/landing-pages.ts).
 *
 * Every line is checked against the code. When one of these ships, delete the
 * line here in the same pull request that ships it.
 *
 * Pure (no imports).
 */
export type NotYetItem = {
  /** The missing thing, as a buyer would name it. */
  title: string;
  /** What exists today instead, in one short sentence. */
  today: string;
};

export const ALTAIR_NOT_YET: readonly NotYetItem[] = [
  {
    title: "QuickBooks or other accounting sync",
    today: "Invoices, payments and expenses are recorded in Altair. A customer list exported from QuickBooks can be imported.",
  },
  {
    title: "A built-in phone system",
    today: "You log a call on the lead by hand, with a note and a next step.",
  },
  {
    title: "Drag-and-drop scheduling",
    today: "You assign and reassign a job from the dispatch board.",
  },
  {
    title: "Automatic routing or live GPS",
    today: "The dispatch map shows today's job addresses, not where the trucks are.",
  },
  {
    title: "An app in the App Store or Google Play",
    today: "It runs in the phone's web browser on iPhone and Android and can be added to the home screen.",
  },
  {
    title: "Automatic payment-reminder emails",
    today: "The overdue list shows who owes you, and resending an invoice is one click.",
  },
  {
    title: "Good, better, best options on an estimate",
    today: "An estimate is one set of line items the customer approves.",
  },
  {
    title: "Importing equipment or job history",
    today: "The import brings over customer names, phone numbers, emails and addresses.",
  },
];
