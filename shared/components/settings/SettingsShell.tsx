import {
  SettingsNavigation,
  SettingsRouteContent,
} from "./SettingsNavigation";

type SettingsShellProps = {
  children: React.ReactNode;
  showSystemCheck: boolean;
};

export function SettingsShell({
  children,
  showSystemCheck,
}: SettingsShellProps) {
  return (
    <section
      aria-label="Settings workspace"
      className="flex w-full min-w-0 flex-col bg-[var(--north-star-content-well)] pb-4"
    >
      <div className="border-b border-[var(--north-star-border)] bg-[var(--north-star-header-strip)] px-4 py-2.5 sm:px-5">
        <div className="mx-auto w-full min-w-0 max-w-[64rem]">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="text-base font-semibold tracking-tight text-[var(--north-star-topbar-heading)]">
              Settings
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--north-star-topbar-subcopy)]">
              Workspace
            </p>
          </div>
          <div className="mt-2">
            <SettingsNavigation showSystemCheck={showSystemCheck} />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full min-w-0 max-w-[64rem] px-4 pt-3.5 sm:px-5">
        <SettingsRouteContent>{children}</SettingsRouteContent>
      </div>
    </section>
  );
}
