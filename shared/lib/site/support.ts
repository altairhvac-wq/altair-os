/**
 * The one support address, shown on the public site and inside the app.
 * Its own module (no imports) so client components such as the error screens
 * can use it without pulling in the plan catalog that faq.ts needs.
 *
 * A domain address, not a personal inbox: Cloudflare Email Routing forwards
 * mail for altair-op.com to the founder (checked 2026-11-12).
 */
export const SUPPORT_EMAIL = "support@altair-op.com";
