import {
  SettingsNavigation,
  SettingsRouteContent,
} from "./SettingsNavigation";

type SettingsShellProps = {
  children: React.ReactNode;
  northStar: boolean;
  showSystemCheck: boolean;
};

export function SettingsShell({
  children,
  northStar,
  showSystemCheck,
}: SettingsShellProps) {
  return (
    <section
      aria-labelledby="settings-shell-title"
      className="mx-auto w-full min-w-0 max-w-[68rem] pb-4"
    >
      <header
        className={`hidden border-b px-1 pb-4 sm:px-0 md:block ${
          northStar ? "border-[var(--north-star-border)]" : "border-altair-border"
        }`}
      >
        <h1
          id="settings-shell-title"
          className={`text-xl font-bold tracking-tight sm:text-2xl ${
            northStar
              ? "text-[var(--north-star-text-light)]"
              : "text-altair-ink"
          }`}
        >
          Settings
        </h1>
        <p
          className={`mt-1 max-w-3xl text-sm leading-6 ${
            northStar
              ? "text-[var(--north-star-text-light-muted)]"
              : "text-altair-ink-secondary"
          }`}
        >
          Configure your company, team, subscription, payments, and workspace.
        </p>
      </header>

      <div className="mt-4 min-w-0 lg:grid lg:grid-cols-[14.5rem_minmax(0,50rem)] lg:items-start lg:gap-8">
        <aside className="sticky top-4 hidden self-start lg:block">
          <SettingsNavigation
            northStar={northStar}
            showSystemCheck={showSystemCheck}
            variant="desktop"
          />
        </aside>

        <div className="min-w-0 max-w-[50rem]">
          <div className="mb-4 lg:hidden">
            <SettingsNavigation
              northStar={northStar}
              showSystemCheck={showSystemCheck}
              variant="mobile"
            />
          </div>

          <SettingsRouteContent>
            {children}
          </SettingsRouteContent>
        </div>
      </div>
    </section>
  );
}
