import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  Database,
  Mail,
  MessageSquareWarning,
  Smartphone,
  Upload,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";
import type { LiveOnboardingInfo } from "@/shared/types/live-onboarding";

type HelpPageViewProps = {
  info: LiveOnboardingInfo;
  companyName: string;
  /** Owners and admins get the setup shortcuts; everyone gets the contacts. */
  showSetupShortcuts: boolean;
  /** Whether the floating Feedback button is switched on for this deployment. */
  feedbackButtonEnabled: boolean;
};

type Shortcut = {
  href: string;
  label: string;
  detail: string;
  icon: LucideIcon;
};

const SETUP_SHORTCUTS: Shortcut[] = [
  {
    href: "/customers/import",
    label: "Import your customers",
    detail: "Upload a CSV from a spreadsheet, Housecall Pro, Jobber, ServiceTitan or QuickBooks.",
    icon: Upload,
  },
  {
    href: "/price-book",
    label: "Build your price book",
    detail: "Add the services you sell most so estimates and invoices price the same way.",
    icon: BookOpen,
  },
  {
    href: "/settings/users",
    label: "Invite your team",
    detail: "Technicians sign in on their phones and see the jobs you assign.",
    icon: Users,
  },
  {
    href: "/settings/billing",
    label: "Take card payments online",
    detail: "Connect Stripe so customers can pay invoices from a link.",
    icon: CreditCard,
  },
  {
    href: "/settings/company#workspace-data",
    label: "Try it with sample data",
    detail: "Load example customers and jobs to look around, then remove them before you go live.",
    icon: Database,
  },
  {
    href: "/install",
    label: "Put Altair on your phone",
    detail: "Add it to your home screen so it opens like an app.",
    icon: Smartphone,
  },
];

function mailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

const cardTitleClass = "text-sm font-bold text-altair-ink-on-paper";
const cardBodyClass = "mt-1 text-sm leading-relaxed text-altair-ink-on-paper-secondary";
const primaryButtonClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] bg-altair-brass px-3.5 py-2 text-sm font-bold text-[#1C1913] transition-colors hover:bg-altair-brass-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";
const secondaryButtonClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-altair-border/60 bg-altair-paper px-3.5 py-2 text-sm font-semibold text-altair-ink-on-paper transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-altair-brass/15 text-[var(--brand-metal-text)]">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

/**
 * One place inside the app that answers "how do I get help?". Before it, the
 * support address appeared only on the public site, the live onboarding the
 * site promises was not linked anywhere in the workspace, and the Feedback
 * button was the only in-app channel (retention audit 2026-11-12).
 */
export function HelpPageView({
  info,
  companyName,
  showSetupShortcuts,
  feedbackButtonEnabled,
}: HelpPageViewProps) {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Help & support"
            subtitle="Talk to a person, join live onboarding, or get set up."
            density="compact"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <MasterPageSurface variant="card" className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <IconBadge icon={Video} />
                <div className="min-w-0">
                  <h2 className={cardTitleClass}>Live onboarding on Zoom</h2>
                  <p className={cardBodyClass}>
                    {info.schedule
                      ? `${info.schedule}.`
                      : "Twice a week."}{" "}
                    Free for every customer. Bring your questions: setup,
                    importing customers, pricing, your first jobs and invoices.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {info.joinUrl ? (
                  <a
                    href={info.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={primaryButtonClass}
                  >
                    Join a session
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : (
                  <a
                    href={mailto(
                      info.supportEmail,
                      `Live onboarding session for ${companyName}`,
                    )}
                    className={primaryButtonClass}
                  >
                    Email us for the next session link
                  </a>
                )}
              </div>
            </MasterPageSurface>

            <MasterPageSurface variant="card" className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <IconBadge icon={Mail} />
                <div className="min-w-0">
                  <h2 className={cardTitleClass}>Email support</h2>
                  <p className={cardBodyClass}>
                    Questions about the product, billing, or something that
                    isn&apos;t working. A person reads every message.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-altair-ink-on-paper">
                    {info.supportEmail}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={mailto(info.supportEmail, `Help with Altair — ${companyName}`)}
                  className={secondaryButtonClass}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Write to us
                </a>
              </div>
            </MasterPageSurface>
          </div>

          <MasterPageSurface variant="card" className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <IconBadge icon={MessageSquareWarning} />
              <div className="min-w-0">
                <h2 className={cardTitleClass}>Something not working?</h2>
                <p className={cardBodyClass}>
                  {feedbackButtonEnabled ? (
                    <>
                      Use the Feedback button at the bottom of the screen on
                      the page where it happened: it tells us which page you
                      were on, and reports go straight to the founder&apos;s
                      inbox. If the button isn&apos;t there, email{" "}
                    </>
                  ) : (
                    <>Email </>
                  )}
                  <a
                    href={mailto(info.supportEmail, `Problem in Altair — ${companyName}`)}
                    className="font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline"
                  >
                    {info.supportEmail}
                  </a>{" "}
                  with what you were doing and what you expected.
                </p>
              </div>
            </div>
          </MasterPageSurface>

          {showSetupShortcuts ? (
            <MasterPageSurface variant="card" className="p-4 sm:p-5">
              <h2 className={cardTitleClass}>Getting set up</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {SETUP_SHORTCUTS.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <li key={shortcut.href}>
                      <Link
                        href={shortcut.href}
                        className="flex h-full items-start gap-3 rounded-[var(--radius-control)] border border-altair-border/50 px-3 py-3 transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                      >
                        <Icon
                          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-metal-text)]"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-altair-ink-on-paper">
                            {shortcut.label}
                          </span>
                          <span className="block text-xs leading-relaxed text-altair-ink-on-paper-secondary">
                            {shortcut.detail}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </MasterPageSurface>
          ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
