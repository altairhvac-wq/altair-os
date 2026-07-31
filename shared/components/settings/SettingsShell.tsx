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
      aria-label="Settings workspace"
      className="mx-auto w-full min-w-0 max-w-[68rem] pb-4"
    >
      <div className="min-w-0 md:grid md:grid-cols-[11.5rem_minmax(0,50rem)] md:items-start md:gap-5 lg:grid-cols-[13rem_minmax(0,50rem)] lg:gap-8">
        <aside className="sticky top-4 hidden self-start md:block">
          <SettingsNavigation
            northStar={northStar}
            showSystemCheck={showSystemCheck}
            variant="desktop"
          />
        </aside>

        <div className="min-w-0 max-w-[50rem]">
          <div className="mb-4 md:hidden">
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
