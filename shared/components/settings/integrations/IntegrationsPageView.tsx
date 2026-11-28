import Link from "next/link";
import {
  CreditCard,
  Download,
  FileText,
  Mail,
  MapPin,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { StatusPill } from "@/shared/design-system/components/StatusPill";
import {
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components/mc-surface";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "@/shared/components/settings/SettingsWorkspacePage";
import type { CardPaymentsConnection } from "@/shared/types/customer-integrations";
import { IntegrationRequestForm } from "./IntegrationRequestForm";

/**
 * Settings > Integrations: what a customer company reads.
 *
 * ============ THREE HONEST LISTS ============
 *   1. Working today: the one outside service a company connects (card
 *      payments through Stripe, with its real status) and the ways records
 *      move in and out (file imports, the full export, the tax summary).
 *   2. Built in: things an owner might think need connecting and do not.
 *   3. Not available yet: named plainly, with no Connect button, no logo and
 *      no date, and a way to say "I would use that one".
 *
 * The page (app/(admin)/settings/integrations/page.tsx) decides what each
 * person may see and passes it in; this component only lays it out. Altair's
 * own marketing channels are a separate block the page adds for platform
 * admins (`platformAdminSlot`).
 *
 * Icons are generic glyphs, never a company's mark: a name in plain text
 * says which service is meant without borrowing its brand.
 */

type RowLink = { label: string; href: string };

type ConnectionRow = {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  status: { label: string; tone: CardPaymentsConnection["tone"] };
  links: readonly RowLink[];
};

export type IntegrationsPageViewProps = {
  cardPayments: CardPaymentsConnection;
  /** Import screens this person may open. Empty hides the row. */
  importLinks: readonly RowLink[];
  /** Owner or admin: may download the full export. */
  canExport: boolean;
  /** May open Reports, where the tax summary lives. */
  canOpenTaxSummary: boolean;
  /** Outgoing email is switched on for this deployment. */
  emailEnabled: boolean;
  /** Where a customer's reply to an estimate or invoice goes, if set. */
  companyEmail: string | null;
  companyName: string;
  /** The company this page was loaded for; the request form sends it back. */
  companyId: string;
  /** Integration key to the day this company asked for it ("Nov 27"). */
  requestedOn: Readonly<Record<string, string>>;
  /** Altair's own marketing channels: platform admins only. */
  platformAdminSlot?: React.ReactNode;
  /**
   * The result of a marketing-channel connect ("YouTube connected"), for a
   * platform admin. Shown at the top, because the connect flow and the
   * Marketing Hub land at the top of this page and the channels are at the
   * bottom.
   */
  platformAdminNotice?: { tone: "success" | "error"; message: string } | null;
};

const linkClass =
  "text-xs font-semibold text-altair-ink underline decoration-altair-border-strong underline-offset-2 hover:decoration-altair-ink";

function ConnectionList({ rows }: { rows: readonly ConnectionRow[] }) {
  return (
    <ul className={altairMcListClass}>
      {rows.map((row, index) => {
        const Icon = row.icon;

        return (
          <li
            key={row.id}
            data-testid={`integration-today-${row.id}`}
            className={`${altairMcListRowClass} ${
              index === 0 ? "" : "border-t border-altair-border"
            }`}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-altair-brass"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-altair-ink">
                    {row.title}
                  </span>
                  <StatusPill tone={row.status.tone} size="sm">
                    {row.status.label}
                  </StatusPill>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-altair-ink-secondary">
                  {row.detail}
                </p>
                {row.links.length > 0 ? (
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {row.links.map((link) => (
                      <Link key={link.href} href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    ))}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function IntegrationsPageView({
  cardPayments,
  importLinks,
  canExport,
  canOpenTaxSummary,
  emailEnabled,
  companyEmail,
  companyName,
  companyId,
  requestedOn,
  platformAdminSlot,
  platformAdminNotice,
}: IntegrationsPageViewProps) {
  const today: ConnectionRow[] = [
    {
      id: "card-payments",
      icon: CreditCard,
      title: "Card payments, through Stripe",
      detail: cardPayments.detail,
      status: { label: cardPayments.statusLabel, tone: cardPayments.tone },
      links: [
        { label: cardPayments.linkLabel, href: "/settings/billing#customer-payments" },
      ],
    },
  ];

  if (importLinks.length > 0) {
    today.push({
      id: "import",
      icon: Upload,
      title: "Bring your records in",
      detail:
        "Loads the CSV or Excel file your current software exports: ServiceTitan, Housecall Pro, Jobber, Service Fusion, QuickBooks or a spreadsheet. A one-time move, not a live link.",
      status: { label: "Ready to use", tone: "success" },
      links: importLinks,
    });
  }

  if (canExport) {
    today.push({
      id: "export",
      icon: Download,
      title: "Take your records out",
      detail:
        "Every record in this workspace in one file, whenever you want it. Yours to keep or to load into another system.",
      status: { label: "Ready to use", tone: "success" },
      links: [{ label: "Export on the Company page", href: "/settings/company#export" }],
    });
  }

  if (canOpenTaxSummary) {
    today.push({
      id: "tax-summary",
      icon: FileText,
      title: "A summary for your accountant",
      detail:
        "Payments collected, sales tax and expenses for the last 7, 30 or 90 days or the year to date, to print or save as a PDF. Altair does not link to accounting software, so this is how the numbers reach your books. Pick the period on Reports, then open the tax summary.",
      status: { label: "Ready to use", tone: "success" },
      links: [{ label: "Open Reports", href: "/reports" }],
    });
  }

  const builtIn: ConnectionRow[] = [];

  if (emailEnabled) {
    builtIn.push({
      id: "email",
      icon: Mail,
      title: "Email to your customers",
      detail: companyEmail
        ? `Estimates, invoices and payment links are emailed for you as "${companyName} via Altair". When a customer replies, it goes to ${companyEmail}.`
        : `Estimates, invoices and payment links are emailed for you as "${companyName} via Altair". Add a company email so a customer's reply reaches you.`,
      status: { label: "Built in", tone: "neutral" },
      links: companyEmail
        ? []
        : [{ label: "Add it on the Company page", href: "/settings/company#profile" }],
    });
  }

  builtIn.push({
    id: "directions",
    icon: MapPin,
    title: "Directions to the job",
    detail:
      "A job's address opens in the maps app on the technician's phone. No account to connect.",
    status: { label: "Built in", tone: "neutral" },
    links: [],
  });

  return (
    <SettingsWorkspacePage
      title="Integrations"
      description="What Altair connects to today, what it doesn't yet, and a way to tell us what your shop needs."
    >
      {platformAdminSlot ? (
        <div
          data-testid="integrations-platform-admin-top"
          className="flex min-w-0 flex-col gap-2"
        >
          {platformAdminNotice ? (
            <SettingsAlertBanner
              tone={platformAdminNotice.tone === "success" ? "success" : "error"}
            >
              {platformAdminNotice.message}
            </SettingsAlertBanner>
          ) : null}
          <p className="text-xs leading-5 text-altair-ink-on-paper-secondary">
            Platform admin:{" "}
            <a href="#marketing-channels" className={linkClass}>
              jump to Altair&apos;s marketing channels
            </a>{" "}
            at the bottom of this page.
          </p>
        </div>
      ) : null}

      <div data-testid="page-settings-integrations-customer" className="flex min-w-0 flex-col gap-4">
        <SettingsWorkspaceSection
          id="today"
          title="Working today"
          description="What your company can use right now."
          card={false}
        >
          <ConnectionList rows={today} />
        </SettingsWorkspaceSection>

        <SettingsWorkspaceSection
          id="built-in"
          title="Built in"
          description="These work on their own. There is nothing to set up."
          card={false}
        >
          <ConnectionList rows={builtIn} />
        </SettingsWorkspaceSection>

        <SettingsWorkspaceSection
          id="request"
          title="Not available yet"
          description="Altair does not connect to any of these today. Tick the ones your shop would use and send them to us, so we know what owners need most."
          className="scroll-mt-24"
        >
          <IntegrationRequestForm companyId={companyId} requestedOn={requestedOn} />
          <p className="mt-4 border-t border-altair-border/60 pt-3 text-[11px] leading-5 text-altair-ink-muted">
            These names belong to their owners. Seeing one here does not mean
            Altair works with that company or is endorsed by it.
          </p>
        </SettingsWorkspaceSection>
      </div>

      {platformAdminSlot ? (
        <div
          id="marketing-channels"
          data-testid="integrations-platform-admin"
          className="min-w-0 scroll-mt-24 border-t border-altair-border pt-4"
        >
          <div className="mb-3">
            <h3 className="text-[15px] font-bold tracking-tight text-altair-ink-on-paper">
              Altair&apos;s own marketing channels
            </h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-altair-ink-on-paper-secondary">
              Only Altair platform admins see this part. Customer companies
              never do.
            </p>
          </div>
          {platformAdminSlot}
        </div>
      ) : null}
    </SettingsWorkspacePage>
  );
}
