/**
 * Legacy founding-beta marketing copy still consumed by the public pricing page.
 * Authoritative launch list prices, intervals, and plan labels live in
 * `lib/saas-billing/catalog.ts` (`SAAS_SUBSCRIPTION_CATALOG`).
 * Do not treat these post-beta amounts as the SaaS pricing source of truth.
 */
export const FOUNDING_BETA_OFFER = [
  "Founding Company Beta",
  "3 Months Free",
  "No credit card required",
  "Lock in founding company pricing",
] as const;

export const FOUNDING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    postBetaPrice: 29,
    description:
      "For owner-operators and small teams ready to leave spreadsheets behind.",
    featured: false,
  },
  {
    id: "growth",
    name: "Growth",
    postBetaPrice: 59,
    description:
      "For growing shops scaling dispatch, crews, and customer volume.",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    postBetaPrice: 99,
    description:
      "For established companies running multi-crew, multi-office operations.",
    featured: false,
  },
] as const;

export const FOUNDING_BETA_FEATURES = [
  "Dispatch & Scheduling",
  "Customer Management",
  "Customer 360",
  "Estimates & Approvals",
  "Invoices & Payments",
  "Equipment Tracking",
  "Technician Mobile App",
  "Time Tracking",
  "Team Management",
  "Business Reporting",
  "AI-Powered Assistants",
  "Full team access during beta",
] as const;
