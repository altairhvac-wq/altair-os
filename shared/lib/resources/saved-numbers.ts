/**
 * "Keep these numbers": one short paragraph under a free calculator saying
 * what Altair Operating System does with the number the visitor just worked
 * out, once it is entered there.
 *
 * ============ EVERY SENTENCE IS SOMETHING THE PRODUCT DOES ============
 * Each note describes one behaviour that exists in the product and is
 * checked by scripts/verify-business-numbers.mjs (the labor line in the
 * price book, the service call item that follows its fee, the old-and-new
 * price list, the monthly target on the dashboard, the job's profit after
 * labor and shop costs, the three planning screens). scripts/
 * verify-resource-center.mjs holds each note to the code that makes it true,
 * so a note cannot outlive the feature it describes.
 *
 * The notes say where a number goes. They never claim a result for the
 * shop (no "more profit", no percentages), never mention a price, and use
 * the product's full name.
 *
 * These behaviours need migrations 218 and 219 in the production database.
 * The notes ship only after both have run there.
 *
 * Pure (no imports) so the verifier can load it as it is.
 */

/** The small heading above every note. */
export const SAVED_NUMBERS_EYEBROW = "Keep these numbers";

/** By calculator slug. A calculator the product has no home for yet has no note. */
export const SAVED_NUMBERS_NOTES: Readonly<Record<string, string>> = {
  "labor-rate":
    "Altair Operating System keeps your labor rate once you have worked it out. It becomes a labor line you can pick on any estimate or invoice, with the hours as the quantity, and your price list is priced from it. Change the rate and it lists each old price beside the new one before anything changes.",
  "service-call-fee":
    "Altair Operating System keeps your service call fee as an item in your price book, one pick away on any estimate or invoice. Change the fee and the item follows it.",
  "break-even":
    "Altair Operating System keeps your monthly target, and your dashboard counts each month's finished jobs against it.",
  "job-profitability":
    "Altair Operating System keeps what an hour of work costs you. A job with time clocked on it then shows an estimate of its profit after labor and shop costs, under its gross profit.",
  "hiring-a-technician":
    "Altair Operating System has this plan inside it. It opens with the wage, payroll costs, hours and rate you have already entered, so you only add the truck.",
  "technician-pay":
    "Altair Operating System has this comparison inside it. It opens with the wage and the week's hours you have already entered.",
  "truck-cost":
    "Altair Operating System has this plan inside it, next to the hiring plan, so the monthly cost you work out for a truck goes into the hire in one press.",
};

/**
 * The public page each note links to: the one that explains that part of
 * the product to a visitor without an account. Estimates and the price book
 * for a rate or a fee; the whole product for the dashboard, job profit and
 * the planning screens.
 */
export const SAVED_NUMBERS_LINKS: Readonly<Record<string, string>> = {
  "labor-rate": "/hvac-estimating-software",
  "service-call-fee": "/hvac-estimating-software",
  "break-even": "/hvac-software",
  "job-profitability": "/hvac-software",
  "hiring-a-technician": "/hvac-software",
  "technician-pay": "/hvac-software",
  "truck-cost": "/hvac-software",
};

/** For the flat-rate price list builder, which is a page of its own. */
export const FLAT_RATE_SAVED_NUMBERS_NOTE =
  "Altair Operating System builds this list with you when you set up your company: common jobs priced from your labor rate and kept as your price book, ready to pick on an estimate.";
