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
      className="mx-auto w-full min-w-0 max-w-[56rem] space-y-5 pb-4"
    >
      <SettingsNavigation
        northStar={northStar}
        showSystemCheck={showSystemCheck}
      />

      <SettingsRouteContent>{children}</SettingsRouteContent>
    </section>
  );
}
