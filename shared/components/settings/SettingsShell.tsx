import {
  altairCanvasInkClass,
  altairCanvasInkMutedClass,
} from "@/shared/design-system/foundation";
import {
  SettingsNavigation,
  SettingsRouteContent,
} from "./SettingsNavigation";

type SettingsShellProps = {
  children: React.ReactNode;
  showSystemCheck: boolean;
  /** The marketing-channel Integrations tab (platform admins only). */
  showIntegrations?: boolean;
};

/**
 * The Settings area: a title on the page, a list of sections beside the
 * content on a wide screen, and a row of tabs above it on a phone.
 *
 * UI audit 2026-11-12: Settings used a white strip of tabs inside a
 * full-width black band, with the content in a narrower column than every
 * other page. On a phone the strip was cut off after "Billing". It read as a
 * different product from the Dashboard. This is the Dashboard's shape: a
 * plain title on the cream page and paper cards under it.
 */
export function SettingsShell({
  children,
  showSystemCheck,
  showIntegrations = false,
}: SettingsShellProps) {
  return (
    <section
      aria-label="Settings workspace"
      className="mx-auto w-full min-w-0 max-w-[76rem] px-1 pb-6 sm:px-2"
    >
      <header className="min-w-0">
        <h1 className={`text-[26px] font-bold leading-tight tracking-tight ${altairCanvasInkClass}`}>
          Settings
        </h1>
        <p className={`mt-1 text-sm ${altairCanvasInkMutedClass}`}>
          Your company details, your plan and payments, and who has access.
        </p>
      </header>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <SettingsNavigation
          showSystemCheck={showSystemCheck}
          showIntegrations={showIntegrations}
        />
        <SettingsRouteContent>{children}</SettingsRouteContent>
      </div>
    </section>
  );
}
