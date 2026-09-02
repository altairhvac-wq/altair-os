"use client";

import { useState, useTransition } from "react";
import { enableAltairSiteAction } from "@/app/actions/marketing-site";
import {
  Briefcase,
  Building2,
  Camera,
  Globe,
  MapPin,
  MessageSquare,
  PlayCircle,
  Plug,
  Sparkles,
  Users2,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  Button,
  EmptyState,
  StatusPill,
} from "@/shared/design-system/components";
import {
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components/mc-surface";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "@/shared/components/settings/SettingsWorkspacePage";
import {
  INTEGRATION_SECTIONS,
  rowsForSection,
  type IntegrationRow,
} from "@/shared/types/integration-row";
import type { IntegrationProvider } from "@/shared/types/integration-provider";

/**
 * Generic glyphs, not brand marks. lucide-react removed its brand icons, and
 * reproducing a platform's logo carries trademark constraints this page has
 * no need to take on — the label already names the provider.
 */
const PROVIDER_ICON: Record<IntegrationProvider, LucideIcon> = {
  facebook: Users2,
  instagram: Camera,
  google_business: MapPin,
  youtube: PlayCircle,
  tiktok: Video,
  linkedin: Briefcase,
  reddit: MessageSquare,
  higgsfield: Sparkles,
  altair_site: Globe,
};

const SECTION_ICON: Record<string, LucideIcon> = {
  publisher: Plug,
  asset_source: Sparkles,
  first_party: Building2,
};

type IntegrationsSettingsViewProps = {
  rows: readonly IntegrationRow[];
  /** Owner/admin. The Server Action re-checks regardless. */
  canManage: boolean;
  flash: { tone: "success" | "error"; message: string } | null;
};

/**
 * Settings → Integrations.
 *
 * ====================== READ-ONLY, DELIBERATELY ======================
 * This page reports what is actually stored and offers exactly one wired
 * action per row where one exists today. It never claims a connection that
 * has not happened: a provider with no credentials on this deployment shows
 * "Not available" and no button, because a Connect button that cannot
 * complete is a worse answer than an honest absence.
 *
 * All display logic lives in `shared/types/integration-row.ts` so every state
 * — including the ones only a third party can put us in — is testable without
 * a browser. This component paints; it does not decide.
 */
export function IntegrationsSettingsView({
  rows,
  canManage,
  flash,
}: IntegrationsSettingsViewProps) {
  return (
    <SettingsWorkspacePage
      title="Integrations"
      description="Publishing channels, creative sources, and the state of each connection."
    >
      <div data-testid="page-settings-integrations">
        {flash ? (
          <div
            role="status"
            className={`mb-3 rounded-none border px-3 py-2 text-xs font-medium ${
              flash.tone === "success"
                ? "border-altair-success/35 bg-altair-success/10 text-altair-ink"
                : "border-altair-danger/35 bg-altair-danger/10 text-altair-ink"
            }`}
          >
            {flash.message}
          </div>
        ) : null}

        {INTEGRATION_SECTIONS.map((section) => {
          const sectionRows = rowsForSection(rows, section.kind);
          const SectionIcon = SECTION_ICON[section.kind] ?? Plug;

          return (
            <SettingsWorkspaceSection
              key={section.kind}
              title={section.title}
              description={section.description}
              card={false}
              className="mb-3"
            >
              {sectionRows.length === 0 ? (
                <EmptyState
                  title={section.emptyTitle}
                  tone="neutral"
                  icon={<SectionIcon className="h-5 w-5" aria-hidden="true" />}
                />
              ) : (
                <ul className={altairMcListClass}>
                  {sectionRows.map((row, index) => (
                    <IntegrationRowItem
                      key={row.provider}
                      row={row}
                      canManage={canManage}
                      first={index === 0}
                    />
                  ))}
                </ul>
              )}
            </SettingsWorkspaceSection>
          );
        })}
      </div>
    </SettingsWorkspacePage>
  );
}

function IntegrationRowItem({
  row,
  canManage,
  first,
}: {
  row: IntegrationRow;
  canManage: boolean;
  first: boolean;
}) {
  const Icon = PROVIDER_ICON[row.provider] ?? Plug;

  return (
    <li
      className={`${altairMcListRowClass} flex flex-wrap items-center justify-between gap-2 ${
        first ? "" : "border-t border-altair-border"
      }`}
      data-testid={`integration-row-${row.provider}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0 text-altair-brass"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-altair-ink">
            {row.label}
          </span>
          <span className="block text-xs leading-5 text-altair-ink-muted">
            {row.identity ? `${row.identity} — ${row.detail}` : row.detail}
          </span>
          {row.missingEnvVars.length > 0 ? (
            // NAMES only. A value here would put a credential in the DOM of
            // every admin who opens this page.
            <span className="mt-0.5 block font-mono text-[10px] leading-4 text-altair-ink-muted">
              Needs: {row.missingEnvVars.join(", ")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusPill tone={row.tone} size="sm">
          {row.statusLabel}
        </StatusPill>
        <IntegrationRowAction row={row} canManage={canManage} />
      </div>
    </li>
  );
}

function IntegrationRowAction({
  row,
  canManage,
}: {
  row: IntegrationRow;
  canManage: boolean;
}) {
  if (row.action === "none") {
    return null;
  }

  // Only the connect hop is wired today, and only for a provider whose
  // authorize route actually exists. Everything else renders disabled rather
  // than pretending: a button that silently does nothing is worse than one
  // that says why it cannot.
  const isConnect = row.action === "connect" || row.action === "reconnect";
  const label =
    row.action === "connect"
      ? "Connect"
      : row.action === "reconnect"
        ? "Reconnect"
        : row.action === "recheck"
          ? "Re-check"
          : row.action === "enable"
            ? "Enable"
            : "Disconnect";

  // The first-party surface is enabled by a Server Action, not by an
  // authorize hop — there is no third party to send anyone to.
  if (row.action === "enable") {
    return <EnableAltairSiteButton canManage={canManage} />;
  }

  const disabledReason = !canManage
    ? "Only owners and admins can manage integrations."
    : isConnect && !row.connectPath
      ? `${row.label} cannot be connected from this deployment yet.`
      : !isConnect
        ? "Available once this connection is wired end to end."
        : undefined;

  if (disabledReason) {
    return (
      <Button variant="quiet" size="sm" disabled title={disabledReason}>
        {label}
      </Button>
    );
  }

  return (
    <Button
      href={row.connectPath ?? "#"}
      variant={row.action === "connect" ? "primary" : "secondary"}
      size="sm"
    >
      {label}
    </Button>
  );
}

/**
 * Enable the Altair website as a publishing destination.
 *
 * A Server Action rather than a link: there is no authorize hop, and the
 * write is ours. The action re-checks the permission itself — this disabled
 * state is a courtesy to the operator, not the control.
 */
function EnableAltairSiteButton({ canManage }: { canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <Button
        variant="quiet"
        size="sm"
        disabled
        title="Only owners and admins can manage integrations."
      >
        Enable
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        size="sm"
        loading={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await enableAltairSiteAction();
            if (result.error) setError(result.error);
          });
        }}
      >
        {pending ? "Enabling…" : "Enable"}
      </Button>
      {error ? (
        <span className="text-xs text-altair-danger">{error}</span>
      ) : null}
    </div>
  );
}
