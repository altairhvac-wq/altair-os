import type { Metadata } from "next";
import {
  LegalPageShell,
  LegalSection,
} from "@/shared/components/marketing/LegalPageShell";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Altair Operating System collects, uses, and protects your data and your customers' data.",
};

/**
 * Public privacy policy. Contact email and governing details reviewed by the
 * founder before launch; update the effective date on material changes.
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      effectiveDate="November 12, 2026"
      intro="Altair Operating System is field-service management software. This policy explains what we collect, why we collect it, and what we do with it when you use altair-op.com and app.altair-op.com. The short version: your business data belongs to you, and we never sell it."
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
          We rely on a small set of infrastructure providers to run Altair:
          Supabase (database and file storage), Vercel (application hosting),
          Stripe (payment processing — card details go directly to Stripe and
          we never store card numbers), Resend (delivers the emails the
          product sends, such as estimates, invoices, invitations and account
          messages), Mapbox (draws the dispatch map; job addresses are sent to
          it to place the pins), Cloudflare (the automated-abuse check on our
          sign-in and sign-up forms), Sentry (error reports from the
          application, set up not to include personal details), OpenAI (powers
          optional AI drafting features, using only the content needed to
          generate the draft), and Meta (only if you connect your Facebook
          Page or Instagram account, and only to publish the posts you
          approve). Each provider processes data solely to deliver their
          service to us.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies and analytics">
        <p>
          The signed-in application uses only the cookies it needs to keep you
          logged in and to protect your session; it sets no advertising or
          analytics cookies. Our public marketing pages (this site, not the
          app) use the Meta Pixel so we can tell which of our videos and ads
          bring people here. It records the marketing page you viewed and
          standard browser information, and it is never loaded on the
          application itself or on the estimate-approval and invoice-payment
          links your customers receive. You can block it with a browser
          tracking blocker or through your Meta ad settings. We do not sell or
          share your data with Meta for any other purpose.
        </p>
        <p>
          We also measure how people use altair-op.com and the app with our
          own first-party analytics. We record the pages you view, the site or
          campaign link that brought you here, and your device type, linked to
          a random identifier stored in your browser. When you are signed in,
          the pages you use in the app are linked to your account so we can
          see which features are used, and when you create an account we keep
          the link that first brought you to us with it. Our analytics do not
          use cookies, do not record your IP address, and are never shared
          with advertising or analytics companies. If your browser sends
          Global Privacy Control or Do Not Track, we do not record your visit.
          We delete these records after 25 months.
        </p>
        <p>
          On the public site the same analytics count a few actions: playing
          the video, pressing a free-trial button, using a calculator,
          downloading a template, or asking for a result by email. We record
          which one it was, never anything you typed.
        </p>
      </LegalSection>

      <LegalSection heading="Free calculators and the email list">
        <p>
          The calculators run in your browser. The numbers you type are saved
          on your own device so they are there next time, and they are not
          sent to us.
        </p>
        <p>
          If you ask us to email your result, the numbers in the calculator
          and your email address are sent to our server to write that one
          email, which Resend delivers. We do not store the numbers. We keep
          your address only if you tick the box to hear about new calculators
          and guides; we then send a confirmation link and add you to the
          list only after you press it. Every email to the list has an
          unsubscribe link, and you can also write to us to be removed.
        </p>
      </LegalSection>

      <LegalSection heading="The contractor directory">
        <p>
          If you list a business in our public directory, the details you
          enter (business name, trade, city and state, ZIP code, service area,
          phone number, website and description) are shown publicly once a
          person here has approved the listing. Your email address is not
          shown. We use it to confirm the listing and to send you the link
          that lets you edit or remove it.
        </p>
        <p>
          You can remove your listing at any time with that link, and it comes
          off the site straight away. To have the record deleted from our
          systems as well, write to us. If you report a listing, we store the
          reason and any note you add, not who you are.
        </p>
      </LegalSection>

      <LegalSection heading="The affiliate program">
        <p>
          If you apply to our affiliate program, we keep what you enter (your
          name, email address, business name, state, the links you give us and
          your answers) so a person here can read the application and reply.
          None of it is shown publicly and none of it is sold or shared for
          advertising. To have your application deleted, write to us.
        </p>
      </LegalSection>

      <LegalSection heading="Your customers' data">
        <p>
          You may store your own customers&apos; contact details and service
          history in Altair. That data is yours: we process it only by
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
            className="font-medium text-[#77591b] underline underline-offset-2"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          . We&apos;ll post any material changes to this page and update the
          effective date.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
