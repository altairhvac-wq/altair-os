import type { Metadata } from "next";
import {
  LegalPageShell,
  LegalSection,
} from "@/shared/components/marketing/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy · Altair OS",
  description:
    "How Altair OS collects, uses, and protects your data and your customers' data.",
};

/**
 * Public privacy policy. Contact email and governing details reviewed by the
 * founder before launch; update the effective date on material changes.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      effectiveDate="August 8, 2026"
      intro="Altair OS is field-service management software. This policy explains what we collect, why we collect it, and what we do with it when you use altair-op.com and app.altair-op.com. The short version: your business data belongs to you, and we never sell it."
    >
      <LegalSection heading="What we collect">
        <p>
          <strong>Account information.</strong> Your name, email address, and
          password (stored as a secure hash — we never see or store your
          plain-text password).
        </p>
        <p>
          <strong>Company workspace data.</strong> What you and your team enter
          to run your business: company profile, customers, jobs, estimates,
          invoices, payments, expenses, time entries, technicians, schedules,
          notes, and uploaded files like receipts and photos.
        </p>
        <p>
          <strong>Usage information.</strong> Basic technical logs (IP address,
          browser type, pages visited, errors) used to keep the service secure
          and reliable.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          We use your data to provide the service — running your dispatch
          board, generating your invoices, sending the notifications you
          configure — and to fix problems, prevent abuse, and improve the
          product. We do not sell your data or your customers&apos; data. Ever.
        </p>
      </LegalSection>

      <LegalSection heading="Who processes it">
        <p>
          We rely on a small set of infrastructure providers to run Altair OS:
          Supabase (database and file storage), Vercel (application hosting),
          Stripe (payment processing — card details go directly to Stripe and
          we never store card numbers), OpenAI (powers optional AI drafting
          features, using only the content needed to generate the draft), and
          Meta (only if you connect your Facebook Page or Instagram account,
          and only to publish the posts you approve). Each provider processes
          data solely to deliver their service to us.
        </p>
      </LegalSection>

      <LegalSection heading="Your customers' data">
        <p>
          You may store your own customers&apos; contact details and service
          history in Altair OS. That data is yours: we process it only by
          operating the software on your instructions, and we never contact
          your customers or use their information for our own purposes.
        </p>
      </LegalSection>

      <LegalSection heading="Retention and deletion">
        <p>
          Your data stays in your workspace while your account is active. If
          you cancel, you can export your data first; we delete workspace data
          within 60 days of account closure, except where the law requires us
          to keep records longer.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Access to production systems is limited and authenticated. Data is
          encrypted in transit (TLS) and at rest by our infrastructure
          providers. Connected-account tokens (like your Facebook Page
          connection) are stored encrypted.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices">
        <p>
          You can update your company profile and settings at any time,
          disconnect social accounts at any time, and request a copy or
          deletion of your data by emailing us.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about this policy:{" "}
          <a
            className="font-medium text-[#977d2a] underline underline-offset-2"
            href="mailto:altairhvac@gmail.com"
          >
            altairhvac@gmail.com
          </a>
          . We&apos;ll post any material changes to this page and update the
          effective date.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
