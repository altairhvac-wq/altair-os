import type { Metadata } from "next";
import {
  LegalPageShell,
  LegalSection,
} from "@/shared/components/marketing/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Altair OS, the operating system for field service businesses.",
};

/**
 * Public terms of service. Reviewed by the founder before launch; update the
 * effective date on material changes.
 */
export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      effectiveDate="August 8, 2026"
      intro="These terms govern your use of Altair OS, the field-service management platform at altair-op.com and app.altair-op.com. By creating an account you agree to them."
    >
      <LegalSection heading="1. Your account">
        <p>
          You must provide accurate information and keep your login credentials
          secure. You&apos;re responsible for activity under your account and
          for the people you invite to your company workspace. You must be at
          least 18 and authorized to act for the business you register.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your data">
        <p>
          Everything you and your team enter — customers, jobs, estimates,
          invoices, files — is yours. You grant us only the license needed to
          host, process, and display it in order to operate the service. We
          don&apos;t sell it or use it to compete with you. You&apos;re
          responsible for having the right to store the information you put in
          (for example, your customers&apos; contact details).
        </p>
      </LegalSection>

      <LegalSection heading="3. Subscriptions and billing">
        <p>
          Altair OS is sold as a subscription with a free trial. Pricing is
          shown at signup and in Settings. Payments are processed by Stripe.
          Subscriptions renew automatically until canceled; you can cancel
          anytime and keep access through the end of the paid period. Except
          where required by law, payments are non-refundable.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>
          Don&apos;t misuse the service: no unlawful content or activity, no
          attempting to breach security or access other companies&apos;
          workspaces, no reselling the service, no abusive load or scraping,
          and no using the platform to send spam. Social publishing features
          post only content you explicitly approve; you&apos;re responsible
          for what you publish to your connected accounts.
        </p>
      </LegalSection>

      <LegalSection heading="5. AI features">
        <p>
          Some features generate drafts (marketing posts, summaries) using AI.
          Drafts are suggestions — review them before use. You&apos;re
          responsible for content you approve and publish.
        </p>
      </LegalSection>

      <LegalSection heading="6. Service availability">
        <p>
          We work hard to keep Altair OS fast and available, but the service is
          provided &quot;as is&quot; without warranties of uninterrupted or
          error-free operation. We may update, add, or remove features as the
          product evolves.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, our total liability for any
          claim arising out of the service is limited to the amounts you paid
          us in the 12 months before the claim. We are not liable for
          indirect, incidental, or consequential damages, or for loss of
          profits, revenue, or data — keep exports of critical records.
        </p>
      </LegalSection>

      <LegalSection heading="8. Termination">
        <p>
          You can close your account at any time. We may suspend or terminate
          accounts that violate these terms, with notice where practical.
          Sections that by their nature survive termination (your data rights,
          liability limits, governing law) survive.
        </p>
      </LegalSection>

      <LegalSection heading="9. Governing law">
        <p>
          These terms are governed by the laws of the State of Utah, USA,
          without regard to conflict-of-law rules. Disputes will be resolved in
          the state or federal courts located in Utah.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes">
        <p>
          We may update these terms; material changes will be announced in-app
          or by email at least 14 days before they take effect. Continued use
          after that date means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms:{" "}
          <a
            className="font-medium text-[#977d2a] underline underline-offset-2"
            href="mailto:altairhvac@gmail.com"
          >
            altairhvac@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
