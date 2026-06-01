import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  description?: string;
  id?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSection({
  title,
  description,
  id,
  children,
  className = "",
}: SettingsSectionProps) {
  return (
    <section
      id={id}
      className={`min-w-0 max-w-full space-y-2.5 sm:space-y-3 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="admin-heading-section text-sm sm:text-base">{title}</h2>
        {description ? (
          <p className="admin-text-helper hidden sm:inline">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
