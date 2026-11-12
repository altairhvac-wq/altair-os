/**
 * "In Altair Operating System" notes shown beside each calculator and template.
 *
 * Only modules marked Production in docs/product/ALTair_BRAIN.md appear
 * here, and every sentence describes where the feature sits in the product,
 * never a result a customer achieved. The product pages themselves are
 * signed-in routes, so each note links to the public landing page that
 * explains that part of the product to a visitor without an account.
 * (They used to point at /#features, an anchor that stopped existing when
 * the sign-in screen became the homepage on 2026-10-31, so every "See Price
 * Book" link dropped the visitor on a login form.)
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

const PRODUCT_PAGE = "/hvac-software";
const ESTIMATING_PAGE = "/hvac-estimating-software";
const INVOICING_PAGE = "/hvac-invoicing-software";
const DISPATCH_PAGE = "/hvac-dispatch-software";

export const ALTAIR_FEATURE_LINKS: Record<AltairFeatureKey, AltairFeatureLink> = {
  "price-book": {
    key: "price-book",
    label: "Price Book",
    href: ESTIMATING_PAGE,
    note: "The Price Book in Altair Operating System is where a priced service item lives once you have worked it out, so estimates and invoices pull the same line instead of retyping it.",
  },
  estimates: {
    key: "estimates",
    label: "Estimates",
    href: ESTIMATING_PAGE,
    note: "Estimates in Altair Operating System carry line items from the price book, track draft, sent, approved and declined states, and can be approved by the customer from a link.",
  },
  invoices: {
    key: "invoices",
    label: "Invoices",
    href: INVOICING_PAGE,
    note: "Invoices in Altair Operating System convert from an approved estimate, track sent, paid and overdue states, and give the customer a payment link.",
  },
  dispatch: {
    key: "dispatch",
    label: "Dispatch",
    href: DISPATCH_PAGE,
    note: "The Dispatch board in Altair Operating System shows today's jobs, who is assigned, and what is still unassigned or in progress, which covers much of the morning checklist in one view.",
  },
  reports: {
    key: "reports",
    label: "Reports",
    href: PRODUCT_PAGE,
    note: "Reports in Altair Operating System show revenue, cash and technician profitability over the last 7, 30 or 90 days or the year to date, which is where your own numbers for these calculators can come from.",
  },
  "time-clock": {
    key: "time-clock",
    label: "Time Clock",
    href: PRODUCT_PAGE,
    note: "The Time Clock in Altair Operating System records shift and job labor hours, so hours paid and hours billed are recorded rather than guessed.",
  },
};
