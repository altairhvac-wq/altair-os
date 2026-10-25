/**
 * "In Altair OS" notes shown beside each calculator and template.
 *
 * Only modules marked Production in docs/product/ALTair_BRAIN.md appear
 * here, and every sentence describes where the feature sits in the product,
 * never a result a customer achieved. The product pages themselves are
 * signed-in routes, so the public link is the Product section of the
 * homepage, which lists these modules for a visitor without an account.
 *
 * Pure (no imports) so the verifier can check the keys and wording.
 */

export type AltairFeatureKey =
  | "price-book"
  | "estimates"
  | "invoices"
  | "dispatch"
  | "reports"
  | "time-clock";

export type AltairFeatureLink = {
  key: AltairFeatureKey;
  label: string;
  href: string;
  /** One short paragraph: where Altair helps with this task. */
  note: string;
};

const PRODUCT_SECTION = "/#features";

export const ALTAIR_FEATURE_LINKS: Record<AltairFeatureKey, AltairFeatureLink> = {
  "price-book": {
    key: "price-book",
    label: "Price Book",
    href: PRODUCT_SECTION,
    note: "The Price Book in Altair OS is where a priced service item lives once you have worked it out, so estimates and invoices pull the same line instead of retyping it.",
  },
  estimates: {
    key: "estimates",
    label: "Estimates",
    href: PRODUCT_SECTION,
    note: "Estimates in Altair OS carry line items from the price book, track draft, sent, approved and declined states, and can be approved by the customer from a link.",
  },
  invoices: {
    key: "invoices",
    label: "Invoices",
    href: PRODUCT_SECTION,
    note: "Invoices in Altair OS convert from an approved estimate, track sent, paid and overdue states, and give the customer a payment link.",
  },
  dispatch: {
    key: "dispatch",
    label: "Dispatch",
    href: PRODUCT_SECTION,
    note: "The Dispatch board in Altair OS shows today's jobs, who is assigned, and what is still unassigned or in progress, which covers much of the morning checklist in one view.",
  },
  reports: {
    key: "reports",
    label: "Reports",
    href: PRODUCT_SECTION,
    note: "Reports in Altair OS show revenue, cash and technician profitability over 7-day to 12-month ranges, which is where your own numbers for these calculators can come from.",
  },
  "time-clock": {
    key: "time-clock",
    label: "Time Clock",
    href: PRODUCT_SECTION,
    note: "The Time Clock in Altair OS records shift and job labor hours, so hours paid and hours billed are recorded rather than guessed.",
  },
};
